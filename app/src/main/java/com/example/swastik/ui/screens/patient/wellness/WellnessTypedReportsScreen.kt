package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.remote.dto.ChartPointDto
import com.example.swastik.data.remote.dto.WellnessReportSectionDto
import com.example.swastik.ui.viewmodel.WellnessViewModel
import com.example.swastik.ui.viewmodel.parseReportSections
import com.google.gson.JsonObject
import java.util.Locale

private val WellnessGreen = Color(0xFF2E7D32)

private data class FallbackMetric(
    val title: String,
    val value: String,
    val unit: String,
    val icon: ImageVector,
    val color: Color
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessTypedReportsScreen(
    onBackClick: () -> Unit,
    viewModel: WellnessViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.refreshTypedReports() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Reports & Analytics", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAF8))
        ) {
            when {
                uiState.isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = WellnessGreen)
                    }
                }
                uiState.error != null && uiState.reports == null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color.Red, modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(8.dp))
                            Text(uiState.error ?: "Something went wrong", color = Color.Gray)
                            Spacer(Modifier.height(12.dp))
                            TextButton(onClick = { viewModel.refreshTypedReports() }) {
                                Text("Retry", color = WellnessGreen)
                            }
                        }
                    }
                }
                uiState.reports == null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.Description, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(12.dp))
                            Text("No reports available", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = Color.Gray)
                        }
                    }
                }
                else -> {
                    val reports = uiState.reports!!
                    val sections = parseReportSections(reports)
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        item { PeriodHeader(reports) }
                        if (sections.isNotEmpty()) {
                            items(sections) { section -> TypedSectionCard(section) }
                        } else {
                            items(buildFallbackMetrics(reports)) { metric -> FallbackMetricCard(metric) }
                        }
                        item { Spacer(Modifier.height(8.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun PeriodHeader(reports: JsonObject) {
    val period = reports.getAsJsonObject("period")
    val days = period?.get("days")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asInt
    val from = period?.get("from")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isString }?.asString
    val to = period?.get("to")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isString }?.asString
    val generatedAt = reports.get("generatedAt")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isString }?.asString

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = WellnessGreen),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Wellness Report", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
            Spacer(Modifier.height(6.dp))
            val periodText = buildString {
                if (days != null) append("Last $days days")
                if (from != null && to != null) {
                    if (isNotEmpty()) append(" • ")
                    append("$from to $to")
                }
            }
            if (periodText.isNotEmpty()) {
                Text(periodText, fontSize = 13.sp, color = Color.White.copy(alpha = 0.9f))
            }
            if (generatedAt != null) {
                Spacer(Modifier.height(4.dp))
                Text("Generated: $generatedAt", fontSize = 11.sp, color = Color.White.copy(alpha = 0.7f))
            }
        }
    }
}

@Composable
private fun TypedSectionCard(section: WellnessReportSectionDto) {
    val type = section.type ?: "workout"
    val icon = when (type) {
        "nutrition" -> Icons.Filled.Restaurant
        "sleep" -> Icons.Filled.Bedtime
        "recovery" -> Icons.Filled.Favorite
        else -> Icons.Filled.FitnessCenter
    }
    val color = when (type) {
        "nutrition" -> Color(0xFFFF6D00)
        "sleep" -> Color(0xFF5C6BC0)
        "recovery" -> Color(0xFFE53935)
        else -> WellnessGreen
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .background(color.copy(alpha = 0.1f), RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(section.title, fontSize = 13.sp, color = Color.Gray)
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(formatValue(section.value), fontWeight = FontWeight.ExtraBold, fontSize = 24.sp)
                        if (!section.unit.isNullOrBlank()) {
                            Spacer(Modifier.width(4.dp))
                            Text(section.unit, fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(bottom = 4.dp))
                        }
                    }
                }
                section.trendPercent?.let { trend ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (trend >= 0) Icons.Filled.TrendingUp else Icons.Filled.TrendingDown,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = if (trend >= 0) WellnessGreen else Color.Red
                        )
                        Spacer(Modifier.width(2.dp))
                        Text(
                            "${if (trend >= 0) "+" else ""}${formatValue(trend)}%",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (trend >= 0) WellnessGreen else Color.Red
                        )
                    }
                }
            }

            section.chartData?.takeIf { it.isNotEmpty() }?.let { chartData ->
                Spacer(Modifier.height(16.dp))
                BarChart(chartData = chartData, color = color)
            }
        }
    }
}

@Composable
private fun BarChart(chartData: List<ChartPointDto>, color: Color) {
    val maxValue = chartData.maxOfOrNull { it.value }?.takeIf { it > 0 } ?: 1.0
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        chartData.forEach { point ->
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp)
                        .background(Color(0xFFF5F5F5), RoundedCornerShape(6.dp))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .fillMaxHeight((point.value / maxValue).toFloat().coerceIn(0f, 1f))
                            .align(Alignment.BottomCenter)
                            .background(color.copy(alpha = 0.85f), RoundedCornerShape(6.dp))
                    )
                }
                Spacer(Modifier.height(4.dp))
                if (point.label.isNotBlank()) {
                    Text(point.label, fontSize = 9.sp, color = Color.Gray, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}

@Composable
private fun FallbackMetricCard(metric: FallbackMetric) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(metric.color.copy(alpha = 0.1f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(metric.icon, contentDescription = null, tint = metric.color, modifier = Modifier.size(24.dp))
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(metric.title, fontSize = 13.sp, color = Color.Gray)
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(metric.value, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp)
                    Spacer(Modifier.width(4.dp))
                    Text(metric.unit, fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(bottom = 4.dp))
                }
            }
        }
    }
}

private fun buildFallbackMetrics(report: JsonObject): List<FallbackMetric> {
    val metrics = mutableListOf<FallbackMetric>()

    report.getAsJsonObject("workoutSummary")?.let { summary ->
        metrics += FallbackMetric(
            "Workouts Completed",
            summary.get("completed")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble?.let(::formatValue) ?: "0",
            "workouts",
            Icons.Filled.FitnessCenter,
            WellnessGreen
        )
        metrics += FallbackMetric(
            "Total Minutes",
            summary.get("totalMinutes")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble?.let(::formatValue) ?: "0",
            "min",
            Icons.Filled.Timer,
            Color(0xFF1565C0)
        )
        metrics += FallbackMetric(
            "Calories Burned",
            summary.get("totalCalories")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble?.let(::formatValue) ?: "0",
            "kcal",
            Icons.Filled.LocalFireDepartment,
            Color(0xFFFF6D00)
        )
        summary.get("painReports")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble?.let { pain ->
            metrics += FallbackMetric(
                "Pain Reports",
                formatValue(pain),
                "reports",
                Icons.Filled.Report,
                Color(0xFFE53935)
            )
        }
    }

    report.getAsJsonObject("wearableSummary")?.let { summary ->
        metrics += FallbackMetric(
            "Days Synced",
            summary.get("daysSynced")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble?.let(::formatValue) ?: "0",
            "days",
            Icons.Filled.Devices,
            Color(0xFF0288D1)
        )
        metrics += FallbackMetric(
            "Total Steps",
            summary.get("totalSteps")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble?.let(::formatValue) ?: "0",
            "steps",
            Icons.Filled.DirectionsWalk,
            WellnessGreen
        )
        metrics += FallbackMetric(
            "Active Calories",
            summary.get("totalActiveCalories")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble?.let(::formatValue) ?: "0",
            "kcal",
            Icons.Filled.LocalFireDepartment,
            Color(0xFFFF6D00)
        )
        summary.get("averageSleepMinutes")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble?.let { sleep ->
            metrics += FallbackMetric(
                "Avg Sleep",
                formatValue(sleep / 60.0),
                "hrs",
                Icons.Filled.Bedtime,
                Color(0xFF5C6BC0)
            )
        }
    }

    report.getAsJsonArray("badges")?.let {
        metrics += FallbackMetric("Badges Earned", it.size().toString(), "badges", Icons.Filled.MilitaryTech, Color(0xFFF57F17))
    }
    report.getAsJsonArray("coachingSessions")?.let {
        metrics += FallbackMetric("Coaching Sessions", it.size().toString(), "sessions", Icons.Filled.SupportAgent, Color(0xFF7B1FA2))
    }
    report.getAsJsonArray("supplementChecks")?.let {
        metrics += FallbackMetric("Supplement Checks", it.size().toString(), "checks", Icons.Filled.Medication, WellnessGreen)
    }
    report.getAsJsonArray("aiInsights")?.let {
        metrics += FallbackMetric("AI Insights", it.size().toString(), "insights", Icons.Filled.Lightbulb, Color(0xFF283593))
    }

    return metrics
}

private fun formatValue(value: Double): String =
    if (value % 1.0 == 0.0) value.toLong().toString() else String.format(Locale.US, "%.1f", value)
