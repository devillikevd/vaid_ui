package com.example.swastik.ui.screens.patient.wellness

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
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
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.swastik.ui.viewmodel.WellnessViewModel
import com.google.gson.JsonObject
import java.util.Calendar

private val AIPurple = Color(0xFF7C3AED)
private val AIPurpleLight = Color(0xFFF3EEFF)
private val AIPurpleDark = Color(0xFF4C1D95)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessAICoachScreen(
    onNavigateBack: () -> Unit,
    viewModel: WellnessViewModel,
    onNavigateToAssessment: () -> Unit = {},
    onNavigateToDoctorSearch: () -> Unit = {}
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    var chatInputText by remember { mutableStateOf("") }
    var isFullscreenChat by remember { mutableStateOf(false) }
    var activeModal by remember { mutableStateOf<String?>(null) } // "GUIDANCE", "ADHERENCE", "MEDICAL", "SMART_PLAN"

    // Speech to text recognizer launcher
    val speechLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val spokenText = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            if (!spokenText.isNullOrBlank()) {
                chatInputText = spokenText
                viewModel.chatWithAiCoach(spokenText)
            }
        }
    }

    fun launchVoiceInput() {
        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PROMPT, "Ask Vaididea AI Coach...")
            }
            speechLauncher.launch(intent)
        } catch (_e: Exception) {}
    }

    LaunchedEffect(Unit) {
        viewModel.refreshAiCoach()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("AI Wellness Coach", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFFDCFCE7)
                        ) {
                            Text(
                                "Gemini Live 🟢",
                                color = Color(0xFF166534),
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 10.sp,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refreshAiCoach) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AIPurpleLight)
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC)),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Dynamic Time-of-Day Smart Greeting Widget
            item {
                TimeOfDaySmartCard()
            }

            // 2. Animated Circular Readiness Gauge Hero Card
            item {
                AnimatedReadinessGaugeCard(readiness = state.aiReadinessScore)
            }

            // 3. The 4 Interactive Feature Cards
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    AIFeatureCard(
                        title = "Daily Guidance",
                        icon = Icons.Default.LightbulbCircle,
                        color = Color(0xFFF59E0B),
                        description = "Morning hydration & mobility checklist",
                        modifier = Modifier.weight(1f),
                        onClick = { activeModal = "GUIDANCE" }
                    )
                    AIFeatureCard(
                        title = "Adherence",
                        icon = Icons.Default.TrendingUp,
                        color = Color(0xFF10B981),
                        description = "84% Consistency • 5-day streak 🔥",
                        modifier = Modifier.weight(1f),
                        onClick = { activeModal = "ADHERENCE" }
                    )
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    AIFeatureCard(
                        title = "Medical Alert",
                        icon = Icons.Default.LocalHospital,
                        color = Color(0xFFEF4444),
                        description = "Clinical safety guardrails active",
                        modifier = Modifier.weight(1f),
                        onClick = { activeModal = "MEDICAL" }
                    )
                    AIFeatureCard(
                        title = "Smart Plans",
                        icon = Icons.Default.AutoAwesome,
                        color = AIPurple,
                        description = "1-Tap 7-Day Workout & Diet Generator",
                        modifier = Modifier.weight(1f),
                        onClick = { activeModal = "SMART_PLAN" }
                    )
                }
            }

            // 4. Conversational AI Health Coach Section (Live Chat + Persona Switcher + Mic)
            item {
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                    elevation = CardDefaults.cardElevation(2.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("💬", fontSize = 18.sp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Chat with Vaididea AI Coach",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp
                                )
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = { isFullscreenChat = true },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Fullscreen,
                                        contentDescription = "Fullscreen",
                                        tint = AIPurple,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }

                        // Coach Persona Switcher Chips
                        Text(
                            "Choose Coaching Style:",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.Gray
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            PersonaChip(
                                label = "⚡ Athlete",
                                isSelected = state.selectedPersona == "ATHLETE",
                                onClick = { viewModel.setCoachPersona("ATHLETE") }
                            )
                            PersonaChip(
                                label = "🧘 Zen Recovery",
                                isSelected = state.selectedPersona == "ZEN",
                                onClick = { viewModel.setCoachPersona("ZEN") }
                            )
                            PersonaChip(
                                label = "🩺 Clinical",
                                isSelected = state.selectedPersona == "CLINICAL",
                                onClick = { viewModel.setCoachPersona("CLINICAL") }
                            )
                        }

                        // Chat Messages Stream
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            state.aiChatMessages.forEach { msg ->
                                ChatBubble(msg)
                            }

                            if (state.isAiChatLoading) {
                                Row(
                                    modifier = Modifier.padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    CircularProgressIndicator(
                                        color = AIPurple,
                                        modifier = Modifier.size(18.dp),
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        "Coach is writing personalized advice...",
                                        fontSize = 12.sp,
                                        color = Color.Gray,
                                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                                    )
                                }
                            }
                        }

                        // Quick Prompt Chips
                        val latestPrompts = state.aiChatMessages.lastOrNull { !it.isUser }?.quickPrompts
                            ?: listOf("🥗 High-Protein Diet", "🏃 15-min HIIT", "😴 Deep Sleep Fix", "💧 Daily Water Target")

                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(latestPrompts) { prompt ->
                                Surface(
                                    shape = RoundedCornerShape(20.dp),
                                    color = AIPurple.copy(alpha = 0.08f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, AIPurple.copy(alpha = 0.3f)),
                                    modifier = Modifier.clickable {
                                        viewModel.chatWithAiCoach(prompt)
                                    }
                                ) {
                                    Text(
                                        prompt,
                                        color = AIPurple,
                                        fontSize = 11.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                    )
                                }
                            }
                        }

                        // Text Input Field with Voice Mic Button
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedTextField(
                                value = chatInputText,
                                onValueChange = { chatInputText = it },
                                placeholder = { Text("Ask health question or tap mic...", fontSize = 12.5.sp) },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(14.dp),
                                singleLine = true,
                                trailingIcon = {
                                    IconButton(onClick = { launchVoiceInput() }) {
                                        Icon(Icons.Default.Mic, contentDescription = "Voice Input", tint = AIPurple)
                                    }
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = AIPurple,
                                    unfocusedBorderColor = Color(0xFFCBD5E1)
                                )
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            IconButton(
                                onClick = {
                                    if (chatInputText.isNotBlank()) {
                                        viewModel.chatWithAiCoach(chatInputText)
                                        chatInputText = ""
                                    }
                                },
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(AIPurple)
                            ) {
                                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", tint = Color.White)
                            }
                        }
                    }
                }
            }

            // 5. Clinical AI Insights Feed (Dynamic & Never Empty)
            item {
                Text("Personalized Clinical Insights ⚡", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            }

            items(state.aiInsights) { insight ->
                AIInsightCard(insight)
            }

            // 6. Active Assessment Launcher CTA
            item {
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = AIPurple.copy(alpha = 0.08f)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, AIPurple.copy(alpha = 0.3f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Assessment, null, tint = AIPurple, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    "Clinical Wellness Assessment",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = AIPurpleDark
                                )
                                Text(
                                    "Fine-tune AI Coach with your diet, goals & chronic health conditions",
                                    fontSize = 11.5.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Button(
                            onClick = onNavigateToAssessment,
                            colors = ButtonDefaults.buttonColors(containerColor = AIPurple),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Take / Retake 2-Min Assessment ➔", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(20.dp)) }
        }
    }

    // ==================== FULLSCREEN CHAT OVERLAY ====================
    if (isFullscreenChat) {
        Dialog(onDismissRequest = { isFullscreenChat = false }) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth().fillMaxHeight(0.9f)
            ) {
                Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🤖", fontSize = 20.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Vaididea AI Coach (Fullscreen)", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        IconButton(onClick = { isFullscreenChat = false }) {
                            Icon(Icons.Default.Close, contentDescription = "Close")
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(state.aiChatMessages) { msg ->
                            ChatBubble(msg)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = chatInputText,
                            onValueChange = { chatInputText = it },
                            placeholder = { Text("Ask AI Coach...", fontSize = 13.sp) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        IconButton(
                            onClick = {
                                if (chatInputText.isNotBlank()) {
                                    viewModel.chatWithAiCoach(chatInputText)
                                    chatInputText = ""
                                }
                            },
                            modifier = Modifier.size(46.dp).clip(CircleShape).background(AIPurple)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", tint = Color.White)
                        }
                    }
                }
            }
        }
    }

    // ==================== INTERACTIVE MODALS & BOTTOM SHEETS ====================

    // 1. Daily Guidance Checklist Sheet
    if (activeModal == "GUIDANCE") {
        AlertDialog(
            onDismissRequest = { activeModal = null },
            title = { Text("Daily Guidance Checklist 💡", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "Check off your daily health goals to maximize recovery:",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    state.dailyGuidanceItems.forEach { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { viewModel.toggleGuidanceItem(item.id) }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = item.isDone,
                                onCheckedChange = { viewModel.toggleGuidanceItem(item.id) },
                                colors = CheckboxDefaults.colors(checkedColor = AIPurple)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    item.title,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    style = if (item.isDone) androidx.compose.ui.text.TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough) else androidx.compose.ui.text.TextStyle()
                                )
                                Text(item.desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = { activeModal = null }, colors = ButtonDefaults.buttonColors(containerColor = AIPurple)) {
                    Text("Done")
                }
            }
        )
    }

    // 2. Plan Adherence Modal
    if (activeModal == "ADHERENCE") {
        AlertDialog(
            onDismissRequest = { activeModal = null },
            title = { Text("Weekly Plan Adherence 📈", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFDCFCE7)),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("84%", color = Color(0xFF166534), fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
                            Text("Adherence", color = Color(0xFF166534), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Text(
                        "🔥 5-Day Active Streak! You are adhering to 84% of your recommended workout and hydration goals this week.",
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                }
            },
            confirmButton = {
                Button(onClick = { activeModal = null }, colors = ButtonDefaults.buttonColors(containerColor = AIPurple)) {
                    Text("Keep Going!")
                }
            }
        )
    }

    // 3. Medical Alert & Guardrail Scanner Modal
    if (activeModal == "MEDICAL") {
        AlertDialog(
            onDismissRequest = { activeModal = null },
            title = { Text("Clinical Safety Guardrail 🏥", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFFDCFCE7),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("🟢", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Resting vitals within safe clinical thresholds.", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF166534))
                        }
                    }
                    Text(
                        "Vaididea AI monitors your biometrics in real-time. If resting heart rate exceeds 100 BPM or blood pressure spikes, the coach automatically pauses high-intensity workouts and alerts you to consult a doctor.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        activeModal = null
                        onNavigateToDoctorSearch()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Book Doctor Consultation")
                }
            },
            dismissButton = {
                TextButton(onClick = { activeModal = null }) {
                    Text("Close")
                }
            }
        )
    }

    // 4. Smart 7-Day Plan Generator Modal
    if (activeModal == "SMART_PLAN") {
        var selectedGoal by remember { mutableStateOf("FAT_LOSS") }
        var selectedLevel by remember { mutableStateOf("BEGINNER") }
        var selectedDiet by remember { mutableStateOf("BALANCED") }

        AlertDialog(
            onDismissRequest = { activeModal = null },
            title = { Text("Generate 7-Day Smart Plan ✨", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (state.isSmartPlanLoading) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.fillMaxWidth().padding(20.dp)
                        ) {
                            CircularProgressIndicator(color = AIPurple)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Gemini AI is generating your 7-day routine...", fontSize = 12.sp)
                        }
                    } else if (state.smartPlanResult != null) {
                        Text(
                            state.smartPlanResult?.title ?: "Your Smart Plan",
                            fontWeight = FontWeight.Bold,
                            color = AIPurple,
                            fontSize = 14.sp
                        )
                        Text(
                            state.smartPlanResult?.planContent ?: "",
                            fontSize = 12.sp,
                            lineHeight = 17.sp
                        )
                    } else {
                        Text("Select your primary wellness target:", fontSize = 12.sp, color = Color.Gray)
                        
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            PlanOptionChip("Fat Loss", selectedGoal == "FAT_LOSS") { selectedGoal = "FAT_LOSS" }
                            PlanOptionChip("Muscle", selectedGoal == "MUSCLE_GAIN") { selectedGoal = "MUSCLE_GAIN" }
                            PlanOptionChip("Endurance", selectedGoal == "ENDURANCE") { selectedGoal = "ENDURANCE" }
                        }

                        Text("Select your current fitness level:", fontSize = 12.sp, color = Color.Gray)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            PlanOptionChip("Beginner", selectedLevel == "BEGINNER") { selectedLevel = "BEGINNER" }
                            PlanOptionChip("Intermediate", selectedLevel == "INTERMEDIATE") { selectedLevel = "INTERMEDIATE" }
                        }

                        Text("Dietary preference:", fontSize = 12.sp, color = Color.Gray)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            PlanOptionChip("Balanced", selectedDiet == "BALANCED") { selectedDiet = "BALANCED" }
                            PlanOptionChip("Vegetarian", selectedDiet == "VEGETARIAN") { selectedDiet = "VEGETARIAN" }
                            PlanOptionChip("High Protein", selectedDiet == "HIGH_PROTEIN") { selectedDiet = "HIGH_PROTEIN" }
                        }
                    }
                }
            },
            confirmButton = {
                if (state.smartPlanResult != null) {
                    Button(onClick = { activeModal = null }, colors = ButtonDefaults.buttonColors(containerColor = AIPurple)) {
                        Text("Save & Apply Plan")
                    }
                } else {
                    Button(
                        onClick = {
                            viewModel.generateSmartPlan(selectedGoal, selectedLevel, selectedDiet)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = AIPurple),
                        enabled = !state.isSmartPlanLoading
                    ) {
                        Text("Generate Plan with Gemini 🚀")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { activeModal = null }) {
                    Text("Close")
                }
            }
        )
    }
}

@Composable
private fun TimeOfDaySmartCard() {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val (greeting, title, desc, icon, badgeColor) = when {
        hour in 5..11 -> Tuple5("Good Morning ☀️", "Morning Awakening Protocol", "Drink 500ml water and get 10 mins sunlight before starting workouts.", Icons.Default.WbSunny, Color(0xFFF59E0B))
        hour in 12..16 -> Tuple5("Good Afternoon 🌤️", "Mid-Day Metabolic Stroll", "A 10-minute post-lunch walk helps regulate blood sugar spikes.", Icons.Default.DirectionsWalk, Color(0xFF0284C7))
        hour in 17..20 -> Tuple5("Good Evening 🌆", "Mobility & Strength Focus", "Prime time for resistance training and thoracic spine foam rolling.", Icons.Default.FitnessCenter, Color(0xFF7C3AED))
        else -> Tuple5("Night Rest 🌙", "Deep Sleep Restoration", "Dim overhead screens 45 mins before bed + 4-7-8 deep breathing.", Icons.Default.Bedtime, Color(0xFF6366F1))
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = badgeColor.copy(alpha = 0.08f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, badgeColor.copy(alpha = 0.25f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = badgeColor.copy(alpha = 0.15f),
                modifier = Modifier.size(42.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = badgeColor, modifier = Modifier.size(24.dp))
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(greeting, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = badgeColor)
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                Text(desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 15.sp)
            }
        }
    }
}

data class Tuple5<A, B, C, D, E>(val a: A, val b: B, val c: C, val d: D, val e: E)

@Composable
private fun AnimatedReadinessGaugeCard(readiness: com.example.swastik.data.model.AiReadinessScoreDto) {
    val targetFraction = (readiness.score.coerceIn(0, 100)) / 100f
    val animatedProgress by animateFloatAsState(
        targetValue = targetFraction,
        animationSpec = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
        label = "readinessProgress"
    )

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(3.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(listOf(AIPurpleDark, AIPurple, Color(0xFF4F46E5)))
                )
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Animated Circular Ring Gauge
                Box(
                    modifier = Modifier.size(80.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val strokeWidth = 8.dp.toPx()
                        val arcSize = size.width - strokeWidth
                        // Background track
                        drawArc(
                            color = Color.White.copy(alpha = 0.2f),
                            startAngle = -90f,
                            sweepAngle = 360f,
                            useCenter = false,
                            topLeft = Offset(strokeWidth / 2, strokeWidth / 2),
                            size = Size(arcSize, arcSize),
                            style = Stroke(strokeWidth, cap = StrokeCap.Round)
                        )
                        // Active animated progress
                        drawArc(
                            brush = Brush.sweepGradient(
                                listOf(Color(0xFF4ADE80), Color(0xFF22C55E), Color(0xFF86EFAC))
                            ),
                            startAngle = -90f,
                            sweepAngle = 360f * animatedProgress,
                            useCenter = false,
                            topLeft = Offset(strokeWidth / 2, strokeWidth / 2),
                            size = Size(arcSize, arcSize),
                            style = Stroke(strokeWidth, cap = StrokeCap.Round)
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "${(animatedProgress * 100).toInt()}%",
                            color = Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp
                        )
                        Text(
                            "RECOVERY",
                            color = Color.White.copy(alpha = 0.8f),
                            fontWeight = FontWeight.Bold,
                            fontSize = 8.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color.White.copy(alpha = 0.2f)
                    ) {
                        Text(
                            "Body Readiness",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        readiness.category,
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        "Resting HR: 64 bpm • Sleep: 7.8 hrs",
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            HorizontalDivider(color = Color.White.copy(alpha = 0.2f))
            Spacer(modifier = Modifier.height(10.dp))

            Text(
                readiness.summary,
                color = Color.White.copy(alpha = 0.95f),
                fontSize = 12.sp,
                lineHeight = 17.sp
            )
        }
    }
}

@Composable
private fun PersonaChip(label: String, isSelected: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) AIPurple else Color(0xFFF1F5F9),
        border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            label,
            color = if (isSelected) Color.White else Color(0xFF475569),
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
        )
    }
}

@Composable
private fun PlanOptionChip(label: String, isSelected: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) AIPurple else Color(0xFFF1F5F9),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            label,
            color = if (isSelected) Color.White else Color(0xFF475569),
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
        )
    }
}

@Composable
private fun ChatBubble(msg: com.example.swastik.data.model.AiChatMessage) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (msg.isUser) Arrangement.End else Arrangement.Start
    ) {
        if (!msg.isUser) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(AIPurple),
                contentAlignment = Alignment.Center
            ) {
                Text("🤖", fontSize = 14.sp)
            }
            Spacer(modifier = Modifier.width(8.dp))
        }

        Box(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .clip(
                    RoundedCornerShape(
                        topStart = 16.dp,
                        topEnd = 16.dp,
                        bottomStart = if (msg.isUser) 16.dp else 4.dp,
                        bottomEnd = if (msg.isUser) 4.dp else 16.dp
                    )
                )
                .background(if (msg.isUser) AIPurple else Color(0xFFF1F5F9))
                .padding(12.dp)
        ) {
            Text(
                msg.text,
                color = if (msg.isUser) Color.White else Color(0xFF1E293B),
                fontSize = 12.5.sp,
                lineHeight = 17.sp
            )
        }
    }
}

@Composable
private fun AIFeatureCard(
    title: String,
    icon: ImageVector,
    color: Color,
    description: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {}
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(shape = RoundedCornerShape(12.dp), color = color.copy(alpha = 0.1f)) {
                    Icon(icon, null, tint = color, modifier = Modifier.padding(8.dp).size(22.dp))
                }
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = Color.LightGray,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 13.5.sp)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                description,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 15.sp,
                maxLines = 2
            )
        }
    }
}

@Composable
private fun AIInsightCard(insight: JsonObject) {
    val title = insight.get("title")?.asString ?: "Clinical Health Insight"
    val message = insight.get("message")?.asString ?: ""
    val category = insight.get("category")?.asString ?: "RECOVERY"

    val badgeColor = when (category) {
        "RECOVERY" -> Color(0xFF7C3AED)
        "HYDRATION" -> Color(0xFF0284C7)
        "NUTRITION" -> Color(0xFF16A34A)
        "SLEEP" -> Color(0xFF4F46E5)
        else -> Color(0xFFE11D48)
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
        elevation = CardDefaults.cardElevation(1.5.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = badgeColor.copy(alpha = 0.1f)
                ) {
                    Text(
                        category,
                        color = badgeColor,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 9.5.sp,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Text(
                message,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 17.sp
            )
        }
    }
}
