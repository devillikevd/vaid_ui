package com.example.swastik.ui.screens.patient.guardian

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.data.local.GuardianTelemetry
import kotlinx.coroutines.delay
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuardianDashboardScreen(
    onNavigateBack: () -> Unit,
    viewModel: PatientDashboardViewModel
) {
    val guardianEnabled by viewModel.guardianEnabled.collectAsState()
    val guardianSettings by viewModel.guardianSettings.collectAsState()
    val telemetry by viewModel.liveTelemetry.collectAsState()
    val guardianEvents by viewModel.guardianEvents.collectAsState()
    val features = guardianSettings.guardianFeatures
    
    // Background color matching HealthCardScreen
    val mainBgColor = MaterialTheme.colorScheme.primaryContainer

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.guardian_dashboard), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = mainBgColor
                )
            )
        },
        containerColor = mainBgColor
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            LiveStatusHeader(isActive = guardianEnabled)
            
            if (guardianEnabled && (features.fallDetection || features.crashDetection || features.mobilityAnalysis)) {
                LiveTelemetrySection(features = features, telemetry = telemetry)
            }
            
            Text(
                text = stringResource(R.string.monitoring_settings),
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 8.dp)
            )
            
            SettingsList(
                fallEnabled = features.fallDetection,
                crashEnabled = features.crashDetection,
                mobilityEnabled = features.mobilityAnalysis,
                isActive = guardianEnabled
            )
            
            Text(
                text = stringResource(R.string.insights_logs),
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 8.dp)
            )
            
            InsightsSection(
                guardianEnabled = guardianEnabled,
                mobilityEnabled = features.mobilityAnalysis,
                events = guardianEvents
            )
            
            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}

@Composable
fun LiveStatusHeader(isActive: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            PulsingIndicator(isActive = isActive)
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = if (isActive) stringResource(R.string.live_monitoring_active) else stringResource(R.string.monitoring_paused),
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = if (isActive) Color(0xFF2E7D32) else Color.Gray
                )
                Text(
                    text = if (isActive) stringResource(R.string.sensors_are_actively) else stringResource(R.string.turn_on_guardian),
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun LiveTelemetrySection(
    features: com.example.swastik.data.local.GuardianFeaturePreferences,
    telemetry: GuardianTelemetry
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Sensors, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    stringResource(R.string.live_sensor_feed),
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (features.fallDetection) {
                    TelemetryItem(
                        icon = Icons.Default.ScreenRotation,
                        label = stringResource(R.string.telemetry_orientation),
                        value = if (telemetry.isUpright) stringResource(R.string.telemetry_upright) else stringResource(R.string.telemetry_tilted),
                        color = Color(0xFF1976D2)
                    )
                }
                
                if (features.crashDetection) {
                    val speedVal = String.format("%.1f", telemetry.speedKmh)
                    TelemetryItem(
                        icon = Icons.Default.Speed,
                        label = stringResource(R.string.telemetry_speed),
                        value = stringResource(R.string.telemetry_speed_val, speedVal),
                        color = Color(0xFFD32F2F)
                    )
                }
                
                if (features.mobilityAnalysis) {
                    TelemetryItem(
                        icon = Icons.Default.DirectionsRun,
                        label = stringResource(R.string.telemetry_activity),
                        value = telemetry.getActivityName(),
                        color = Color(0xFF388E3C)
                    )
                }
            }
        }
    }
}

@Composable
private fun TelemetryItem(icon: ImageVector, label: String, value: String, color: Color) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.08f))
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(26.dp))
        Spacer(modifier = Modifier.height(8.dp))
        AnimatedContent(
            targetState = value,
            transitionSpec = {
                fadeIn(animationSpec = tween(150)) togetherWith fadeOut(animationSpec = tween(150))
            }, label = "TelemetryValue"
        ) { targetValue ->
            Text(targetValue, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
        }
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun SettingsList(fallEnabled: Boolean, crashEnabled: Boolean, mobilityEnabled: Boolean, isActive: Boolean) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SettingStatusCard(
            title = stringResource(R.string.fall_detection_alerts),
            description = stringResource(R.string.impact_tumble_checking),
            icon = Icons.Default.PersonalInjury,
            isEnabled = fallEnabled,
            isActive = isActive
        )
        SettingStatusCard(
            title = stringResource(R.string.vehicle_crash_detection),
            description = stringResource(R.string.high_speed_collision),
            icon = Icons.Default.CarCrash,
            isEnabled = crashEnabled,
            isActive = isActive
        )
        SettingStatusCard(
            title = stringResource(R.string.mobility_analysis),
            description = stringResource(R.string.gait_balance_tracking),
            icon = Icons.Default.DirectionsWalk,
            isEnabled = mobilityEnabled,
            isActive = isActive
        )
    }
}

@Composable
fun SettingStatusCard(title: String, description: String, icon: ImageVector, isEnabled: Boolean, isActive: Boolean) {
    val actuallyActive = isEnabled && isActive
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (actuallyActive) Color(0xFFE8F5E9) else MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (actuallyActive) Color(0xFF4CAF50).copy(alpha = 0.2f) else Color.LightGray.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = if (actuallyActive) Color(0xFF2E7D32) else Color.Gray)
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                Text(description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(
                text = if (actuallyActive) stringResource(R.string.status_active) else stringResource(R.string.status_off),
                fontWeight = FontWeight.Bold,
                color = if (actuallyActive) Color(0xFF2E7D32) else Color.Gray,
                fontSize = 13.sp
            )
        }
    }
}

@Composable
fun InsightsSection(
    guardianEnabled: Boolean, 
    mobilityEnabled: Boolean,
    events: List<com.example.swastik.data.local.db.GuardianEventEntity>
) {
    val sevenDaysAgo = System.currentTimeMillis() - java.util.concurrent.TimeUnit.DAYS.toMillis(7)
    val recentEvents = events.filter { it.timestamp >= sevenDaysAgo }
    val falls = recentEvents.count { it.eventType == "FALL_DETECTED" }
    
    val fallText = if (falls == 0) stringResource(R.string.no_falls_detected) else stringResource(R.string.falls_detected_format, falls)
    val fallColor = if (falls == 0) Color(0xFF2E7D32) else Color(0xFFD32F2F)

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Fall History
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.History, contentDescription = null, tint = Color.Gray)
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(stringResource(R.string.fall_alerts_log), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text(
                        text = fallText,
                        fontSize = 13.sp,
                        color = fallColor
                    )
                }
            }
        }
        
        // Mobility Score Chart
        if (!guardianEnabled || !mobilityEnabled) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Timeline, contentDescription = null, tint = Color.Gray)
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(stringResource(R.string.mobility_score), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Text(
                            text = stringResource(R.string.mobility_tracking_is_disabled),
                            fontSize = 13.sp,
                            color = Color.Gray
                        )
                    }
                }
            }
        } else {
            val points = mutableListOf<Float>()
            val today = java.util.Calendar.getInstance()
            for (i in 6 downTo 0) {
                val startOfDay = today.clone() as java.util.Calendar
                startOfDay.add(java.util.Calendar.DAY_OF_YEAR, -i)
                startOfDay.set(java.util.Calendar.HOUR_OF_DAY, 0)
                startOfDay.set(java.util.Calendar.MINUTE, 0)
                
                val endOfDay = startOfDay.clone() as java.util.Calendar
                endOfDay.add(java.util.Calendar.DAY_OF_YEAR, 1)
                
                val anomaliesThatDay = events.count { 
                    it.eventType == "GAIT_ANOMALY" && 
                    it.timestamp >= startOfDay.timeInMillis && 
                    it.timestamp < endOfDay.timeInMillis 
                }
                
                val score = (100f - (anomaliesThatDay * 5f)).coerceIn(0f, 100f)
                points.add(score)
            }
            
            com.example.swastik.ui.screens.patient.components.BezierCurveChart(
                dataPoints = points,
                title = stringResource(R.string.gait_stability_score),
                subtitle = stringResource(R.string.last_7_days_higher_is_better),
                lineColor = Color(0xFF1976D2),
                containerColor = MaterialTheme.colorScheme.surface,
                yMin = 0f,
                yMax = 100f
            )
        }
    }
}

@Composable
fun PulsingIndicator(isActive: Boolean) {
    val infiniteTransition = rememberInfiniteTransition()
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isActive) 1.5f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Reverse
        ), label = "Pulse"
    )
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = if (isActive) 0f else 0.5f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Restart
        ), label = "PulseAlpha"
    )

    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(24.dp)) {
        if (isActive) {
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .scale(scale)
                    .clip(CircleShape)
                    .background(Color(0xFF4CAF50).copy(alpha = alpha))
            )
        }
        Box(
            modifier = Modifier
                .size(12.dp)
                .clip(CircleShape)
                .background(if (isActive) Color(0xFF4CAF50) else Color.Gray)
        )
    }
}
