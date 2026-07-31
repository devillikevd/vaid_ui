package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ui.viewmodel.WellnessViewModel
import com.google.gson.JsonObject

private val AIPurple = Color(0xFF7C3AED)
private val AIPurpleLight = Color(0xFFF3EEFF)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessAICoachScreen(
    onNavigateBack: () -> Unit,
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.refreshAiCoach() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI Wellness Coach", fontWeight = FontWeight.Bold) },
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
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AIPurple)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(paddingValues),
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
                                .background(Brush.horizontalGradient(listOf(AIPurple, Color(0xFF4F46E5))))
                                .padding(20.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(shape = CircleShape, color = Color.White.copy(alpha = 0.2f), modifier = Modifier.size(48.dp)) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(Icons.Outlined.SelfImprovement, null, tint = Color.White, modifier = Modifier.size(28.dp))
                                    }
                                }
                                Spacer(modifier = Modifier.width(14.dp))
                                Column {
                                    Text("Your AI Coach", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                                    Text("Daily guidance powered by your health data", color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }

                // Feature cards
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        AIFeatureCard("Daily Guidance", Icons.Default.LightbulbCircle, Color(0xFFFFA726), "Personalized tips based on your activity", Modifier.weight(1f))
                        AIFeatureCard("Adherence", Icons.Default.TrendingUp, Color(0xFF4CAF50), "Track how well you follow your plan", Modifier.weight(1f))
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        AIFeatureCard("Medical Alert", Icons.Default.LocalHospital, Color(0xFFE53935), "Auto-escalation when metrics are off", Modifier.weight(1f))
                        AIFeatureCard("Smart Plans", Icons.Default.AutoAwesome, AIPurple, "AI-adjusted workout & diet plans", Modifier.weight(1f))
                    }
                }

                // AI Insights from backend
                if (state.aiInsights.isNotEmpty()) {
                    item {
                        Text("Your AI Insights", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                    }
                    items(state.aiInsights) { insight ->
                        AIInsightCard(insight)
                    }
                } else {
                    item {
                        Card(
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Surface(shape = CircleShape, color = AIPurple.copy(alpha = 0.1f), modifier = Modifier.size(64.dp)) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(Icons.Default.AutoAwesome, null, tint = AIPurple, modifier = Modifier.size(32.dp))
                                    }
                                }
                                Spacer(modifier = Modifier.height(14.dp))
                                Text("AI Insights Loading...", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    "Your personalized AI insights will appear here as you start tracking workouts, meals, and health data.",
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                }

                // Assessment connection
                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = AIPurple.copy(alpha = 0.06f))
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Info, null, tint = AIPurple, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                "Complete your Wellness Assessment to unlock personalized AI coaching recommendations.",
                                fontSize = 12.sp,
                                color = AIPurple,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AIFeatureCard(title: String, icon: ImageVector, color: Color, description: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Surface(shape = RoundedCornerShape(12.dp), color = color.copy(alpha = 0.1f)) {
                Icon(icon, null, tint = color, modifier = Modifier.padding(8.dp).size(22.dp))
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(4.dp))
            Text(description, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 16.sp)
        }
    }
}

@Composable
private fun AIInsightCard(insight: JsonObject) {
    val title = insight.get("title")?.asString ?: insight.get("type")?.asString ?: "Insight"
    val message = insight.get("message")?.asString ?: insight.get("description")?.asString ?: insight.get("content")?.asString ?: ""
    val severity = insight.get("severity")?.asString ?: insight.get("priority")?.asString ?: "info"
    val category = insight.get("category")?.asString

    val (color, icon) = when (severity.lowercase()) {
        "warning", "high" -> Color(0xFFE65100) to Icons.Default.Warning
        "critical", "urgent" -> Color(0xFFE53935) to Icons.Default.Error
        "success", "positive" -> Color(0xFF4CAF50) to Icons.Default.CheckCircle
        else -> AIPurple to Icons.Default.LightbulbCircle
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(shape = RoundedCornerShape(12.dp), color = color.copy(alpha = 0.1f)) {
                Icon(icon, null, tint = color, modifier = Modifier.padding(8.dp).size(22.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    category?.let {
                        Surface(shape = RoundedCornerShape(12.dp), color = color.copy(alpha = 0.12f)) {
                            Text(it, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = color)
                        }
                    }
                }
                if (message.isNotBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(message, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 18.sp)
                }
            }
        }
    }
}
