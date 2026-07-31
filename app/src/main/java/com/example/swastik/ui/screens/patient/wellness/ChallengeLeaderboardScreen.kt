package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.LeaderboardEntryDto
import com.example.swastik.ui.viewmodel.ChallengeLeaderboardViewModel

private val WellnessGreen = Color(0xFF2E7D32)
private val WellnessGreenLight = Color(0xFFE8F5E9)
private val GoldColor = Color(0xFFFFD700)
private val SilverColor = Color(0xFFC0C0C0)
private val BronzeColor = Color(0xFFCD7F32)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChallengeLeaderboardScreen(
    challengeId: String,
    challengeTitle: String,
    onBackClick: () -> Unit
) {
    val viewModel: ChallengeLeaderboardViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(challengeId) {
        viewModel.load(challengeId, challengeTitle)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        challengeTitle,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
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
        Box(
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
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            HeaderCard(totalEntries = uiState.totalEntries, title = challengeTitle)
                        }

                        uiState.error?.let { message ->
                            item {
                                ErrorCard(
                                    message = message,
                                    onRetry = { viewModel.load(challengeId, challengeTitle) }
                                )
                            }
                        }

                        if (!uiState.joined) {
                            item {
                                Button(
                                    onClick = { viewModel.joinChallenge() },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(48.dp),
                                    enabled = !uiState.isJoining,
                                    colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    if (uiState.isJoining) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(20.dp),
                                            color = Color.White,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text("Join Challenge", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        } else {
                            item {
                                val selfEntry = uiState.entries.find { it.isSelf }
                                val unit = selfEntry?.displayUnit ?: "points"
                                UpdateProgressCard(
                                    unit = unit,
                                    isUpdating = uiState.isUpdating,
                                    onUpdate = { value -> viewModel.updateProgress(value, unit) }
                                )
                            }
                        }

                        uiState.progressMessage?.let { message ->
                            item {
                                SuccessNote(message)
                            }
                        }

                        if (uiState.entries.isEmpty() && uiState.error == null) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 32.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(
                                            Icons.Filled.EmojiEvents,
                                            contentDescription = null,
                                            tint = Color.LightGray,
                                            modifier = Modifier.size(56.dp)
                                        )
                                        Spacer(Modifier.height(12.dp))
                                        Text("No entries yet", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Color.Gray)
                                    }
                                }
                            }
                        }

                        if (uiState.entries.isNotEmpty()) {
                            item {
                                Text("Rankings", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            }
                        }

                        items(uiState.entries, key = { it.id ?: it.rank }) { entry ->
                            LeaderboardRow(entry)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HeaderCard(totalEntries: Int, title: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = WellnessGreen),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.EmojiEvents, contentDescription = null, tint = Color.White)
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp,
                    maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text("$totalEntries participants", color = Color.White.copy(alpha = 0.85f), fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun UpdateProgressCard(
    unit: String,
    isUpdating: Boolean,
    onUpdate: (Double) -> Unit
) {
    var valueText by remember { mutableStateOf("") }
    val value = valueText.toDoubleOrNull()

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Update Progress", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = valueText,
                    onValueChange = { valueText = it.filter { c -> c.isDigit() || c == '.' } },
                    modifier = Modifier.weight(1f),
                    label = { Text("Progress value") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    shape = RoundedCornerShape(10.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(unit, fontWeight = FontWeight.Bold, color = WellnessGreen, fontSize = 16.sp)
            }
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = { value?.let(onUpdate) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                enabled = value != null && !isUpdating,
                colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                shape = RoundedCornerShape(10.dp)
            ) {
                if (isUpdating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Update Progress", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun SuccessNote(message: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = WellnessGreenLight)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(message, color = WellnessGreen, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
    }
}

@Composable
private fun ErrorCard(message: String, onRetry: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color(0xFFD32F2F), modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text(message, color = Color(0xFFD32F2F), fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            }
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onRetry, modifier = Modifier.align(Alignment.End)) {
                Text("Retry", color = Color(0xFFD32F2F), fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun LeaderboardRow(entry: LeaderboardEntryDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (entry.isSelf) WellnessGreenLight else Color.White
        ),
        elevation = CardDefaults.cardElevation(if (entry.isSelf) 4.dp else 1.dp),
        border = if (entry.isSelf) BorderStroke(2.dp, WellnessGreen) else null
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val rankColor = when (entry.rank) {
                1 -> GoldColor
                2 -> SilverColor
                3 -> BronzeColor
                else -> Color.Gray
            }
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(rankColor.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("#${entry.rank}", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = rankColor)
            }

            Spacer(Modifier.width(12.dp))

            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (entry.isSelf) WellnessGreen else Color(0xFFE0E0E0)),
                contentAlignment = Alignment.Center
            ) {
                if (!entry.displayImageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = entry.displayImageUrl,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Text(
                        entry.displayName.take(1).uppercase(),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = if (entry.isSelf) Color.White else Color.DarkGray
                    )
                }
            }

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        entry.displayName,
                        fontWeight = if (entry.isSelf) FontWeight.ExtraBold else FontWeight.SemiBold,
                        fontSize = 15.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (entry.isSelf) {
                        Spacer(Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = WellnessGreen
                        ) {
                            Text(
                                "YOU",
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
                entry.patient?.city?.let { city ->
                    if (city.isNotBlank()) {
                        Text(city, fontSize = 12.sp, color = Color.Gray)
                    }
                }
            }

            Spacer(Modifier.width(8.dp))

            Text(
                "${formatScore(entry.score)} ${entry.displayUnit}",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = if (entry.isSelf) WellnessGreen else Color.DarkGray,
                textAlign = TextAlign.End
            )
        }
    }
}

private fun formatScore(score: Double): String =
    if (score % 1.0 == 0.0) score.toInt().toString() else score.toString()
