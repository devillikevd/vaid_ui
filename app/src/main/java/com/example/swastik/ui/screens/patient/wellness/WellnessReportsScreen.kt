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

private val ReportBlue = Color(0xFF4F46E5)
private val ReportBlueLight = Color(0xFFEEF0FF)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessReportsScreen(
    onNavigateBack: () -> Unit,
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.refreshReports() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Reports & Analytics", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refreshReports) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ReportBlueLight)
            )
        }
    ) { paddingValues ->
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = ReportBlue)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Overview Header
                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Brush.horizontalGradient(listOf(ReportBlue, Color(0xFF7C3AED))))
                                .padding(20.dp)
                        ) {
                            Text("Your Wellness Report", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                            Text("Track your progress across workouts, nutrition, and recovery", color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                        }
                    }
                }

                // Workout Summary
                item {
                    ReportSection(
                        title = "Workout Summary",
                        icon = Icons.Default.FitnessCenter,
                        color = Color(0xFF047857),
                        data = state.workoutProgress,
                        keys = listOf("total_workouts", "total_duration_minutes", "calories_burned", "streak_days"),
                        labels = listOf("Total Workouts", "Duration (min)", "Calories Burned", "Streak Days")
                    )
                }

                // Reports from backend
                item {
                    ReportSection(
                        title = "Nutrition Summary",
                        icon = Icons.Default.Restaurant,
                        color = Color(0xFFE65100),
                        data = state.reports,
                        keys = listOf("avg_calories", "avg_protein", "avg_carbs", "avg_fat", "water_intake"),
                        labels = listOf("Avg Calories", "Avg Protein (g)", "Avg Carbs (g)", "Avg Fat (g)", "Water (L)")
                    )
                }

                item {
                    ReportSection(
                        title = "Recovery & Health",
                        icon = Icons.Default.Favorite,
                        color = Color(0xFFE53935),
                        data = state.reports,
                        keys = listOf("avg_sleep_hours", "avg_heart_rate", "recovery_score", "stress_level"),
                        labels = listOf("Avg Sleep (hrs)", "Avg Heart Rate", "Recovery Score", "Stress Level")
                    )
                }

                // Plans summary
                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                            Text("Your Stats", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                StatMetric("Workout Plans", "${state.workoutPlanCount}", Icons.Default.FitnessCenter, Color(0xFF047857), Modifier.weight(1f))
                                StatMetric("Exercises", "${state.exerciseCount}", Icons.Default.SportsGymnastics, Color(0xFF2563EB), Modifier.weight(1f))
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                StatMetric("Experts", "${state.coachCount}", Icons.Default.Groups, Color(0xFF6A5AE0), Modifier.weight(1f))
                                StatMetric("Supplements", "${state.supplementCount}", Icons.Default.ShoppingCart, Color(0xFF9333EA), Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReportSection(
    title: String,
    icon: ImageVector,
    color: Color,
    data: JsonObject?,
    keys: List<String>,
    labels: List<String>
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(12.dp), color = color.copy(alpha = 0.1f)) {
                    Icon(icon, null, tint = color, modifier = Modifier.padding(8.dp).size(22.dp))
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            }
            Spacer(modifier = Modifier.height(14.dp))

            if (data == null) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = color.copy(alpha = 0.06f)
                ) {
                    Text(
                        "Data will appear once you start tracking your $title",
                        modifier = Modifier.padding(14.dp),
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                // Render available metrics in a grid
                val chunkedPairs = keys.zip(labels).chunked(2)
                chunkedPairs.forEach { pair ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        pair.forEach { (key, label) ->
                            val value = data.get(key)?.let {
                                when {
                                    it.isJsonPrimitive && it.asJsonPrimitive.isNumber -> {
                                        val num = it.asDouble
                                        if (num == num.toLong().toDouble()) num.toLong().toString() else String.format("%.1f", num)
                                    }
                                    else -> it.asString
                                }
                            } ?: "—"
                            MetricCard(label = label, value = value, color = color, modifier = Modifier.weight(1f))
                        }
                        // Add spacer if odd number
                        if (pair.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun MetricCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = color.copy(alpha = 0.08f)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = color)
            Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun StatMetric(label: String, value: String, icon: ImageVector, color: Color, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = color.copy(alpha = 0.08f)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                Text(label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
