package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ui.viewmodel.WellnessViewModel
import com.google.gson.JsonObject
import java.time.OffsetDateTime
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

private val WellnessGreen = Color(0xFF2E7D32)

private data class BadgeUi(
    val name: String,
    val description: String,
    val category: String,
    val icon: String,
    val earnedAt: String,
    val isUnlocked: Boolean,
    val progress: Float
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessBadgesScreen(
    onBackClick: () -> Unit,
    viewModel: WellnessViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val badges = remember(uiState.badges) { uiState.badges.map { it.toBadgeUi() } }
    val unlockedCount = badges.count { it.isUnlocked }

    LaunchedEffect(Unit) { viewModel.refreshBadges() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Achievements & Badges", fontWeight = FontWeight.Bold) },
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
        when {
            uiState.isLoading -> {
                Box(
                    Modifier.fillMaxSize().padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = WellnessGreen)
                }
            }
            uiState.error != null -> {
                Box(
                    Modifier.fillMaxSize().padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        modifier = Modifier.padding(24.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color.Red, modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(8.dp))
                            Text(uiState.error ?: "Something went wrong", color = Color.Gray, textAlign = TextAlign.Center)
                            Spacer(Modifier.height(12.dp))
                            TextButton(onClick = { viewModel.refreshBadges() }) {
                                Text("Retry", color = WellnessGreen)
                            }
                        }
                    }
                }
            }
            badges.isEmpty() -> {
                Box(
                    Modifier.fillMaxSize().padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Filled.EmojiEvents, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("No badges yet", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = Color.Gray)
                        Text("Earn badges by completing wellness activities", fontSize = 14.sp, color = Color.LightGray)
                    }
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .background(Color(0xFFF8FAF8))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                WellnessGreen,
                                RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp)
                            )
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("$unlockedCount / ${badges.size}", fontWeight = FontWeight.ExtraBold, fontSize = 36.sp, color = Color.White)
                            Text("Badges Unlocked", fontSize = 14.sp, color = Color.White.copy(alpha = 0.8f))
                        }
                    }

                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        contentPadding = PaddingValues(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        items(badges, key = { it.name }) { badge ->
                            BadgeItemCard(badge)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BadgeItemCard(badge: BadgeUi) {
    val accent = if (badge.isUnlocked) categoryColor(badge.category) else Color.Gray
    Card(
        modifier = Modifier.fillMaxWidth().aspectRatio(0.85f),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(if (badge.isUnlocked) 4.dp else 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp).fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(if (badge.isUnlocked) accent.copy(alpha = 0.1f) else Color(0xFFF5F5F5))
                    .border(2.dp, if (badge.isUnlocked) accent else Color.LightGray, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (badge.icon.isNotBlank()) {
                    Text(badge.icon, fontSize = 28.sp)
                } else {
                    Icon(
                        Icons.Filled.EmojiEvents,
                        contentDescription = null,
                        tint = if (badge.isUnlocked) accent else Color.LightGray,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(
                badge.name,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                color = if (badge.isUnlocked) Color.Black else Color.Gray
            )
            if (badge.category.isNotBlank()) {
                Spacer(Modifier.height(2.dp))
                Text(
                    badge.category,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    color = accent
                )
            }
            Spacer(Modifier.height(4.dp))
            Text(
                badge.description,
                fontSize = 10.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center,
                lineHeight = 12.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(8.dp))
            if (badge.isUnlocked) {
                if (badge.earnedAt.isNotBlank()) {
                    Text(formatEarnedDate(badge.earnedAt), fontSize = 9.sp, color = Color.Gray)
                    Spacer(Modifier.height(4.dp))
                }
                Text("UNLOCKED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = WellnessGreen)
            } else {
                if (badge.progress > 0f) {
                    LinearProgressIndicator(
                        progress = badge.progress,
                        modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                        color = WellnessGreen,
                        trackColor = Color(0xFFE8F5E9)
                    )
                } else {
                    Text("LOCKED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.LightGray)
                }
            }
        }
    }
}

private fun JsonObject.toBadgeUi(): BadgeUi {
    val badgeObj = if (has("badge") && !get("badge").isJsonNull && get("badge").isJsonObject) {
        getAsJsonObject("badge")
    } else null
    val name = badgeObj?.optStr("name") ?: "Badge"
    val description = badgeObj?.optStr("description").orEmpty()
    val category = badgeObj?.optStr("category").orEmpty()
    val icon = badgeObj?.optStr("icon").orEmpty()
    val earnedAt = optStr("earned_at").orEmpty()
    val isUnlocked = if (has("is_unlocked") && !get("is_unlocked").isJsonNull && get("is_unlocked").isJsonPrimitive) {
        get("is_unlocked").asBoolean
    } else {
        earnedAt.isNotBlank()
    }
    val progress = if (has("progress") && !get("progress").isJsonNull && get("progress").isJsonPrimitive) {
        get("progress").asFloat.coerceIn(0f, 1f)
    } else {
        0f
    }
    return BadgeUi(name, description, category, icon, earnedAt, isUnlocked, progress)
}

private fun JsonObject.optStr(key: String): String? =
    if (has(key) && !get(key).isJsonNull && get(key).isJsonPrimitive) get(key).asString else null

private fun categoryColor(category: String?): Color {
    val c = category ?: return Color(0xFF0288D1)
    return when (c.lowercase()) {
        "fitness", "workout", "exercise", "strength" -> WellnessGreen
        "hydration", "nutrition", "diet" -> Color(0xFF0288D1)
        "mindfulness", "meditation", "yoga" -> Color(0xFF7B1FA2)
        "steps", "activity", "walking" -> Color(0xFFF57F17)
        "sleep" -> Color(0xFF5C6BC0)
        else -> Color(0xFF0288D1)
    }
}

private fun formatEarnedDate(raw: String): String {
    return try {
        ZonedDateTime.parse(raw).format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
    } catch (_: Exception) {
        try {
            OffsetDateTime.parse(raw).format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
        } catch (_: Exception) {
            raw
        }
    }
}
