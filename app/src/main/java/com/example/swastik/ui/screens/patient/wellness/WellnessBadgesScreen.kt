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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
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

private data class BadgeUi(
    val id: String,
    val code: String,
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
    val badges = remember(uiState.badges) {
        uiState.badges.mapIndexed { index, json -> json.toBadgeUi(index) }
    }
    val unlockedCount = badges.count { it.isUnlocked }

    LaunchedEffect(Unit) { viewModel.refreshBadges() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Achievements & Badges",
                            fontWeight = FontWeight.ExtraBold,
                            color = WellnessTheme.TealDeep,
                            fontSize = 19.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = WellnessTheme.TealSurfaceVariant
                        ) {
                            Text(
                                text = "🏆 $unlockedCount/${badges.size}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = WellnessTheme.TealDark,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = WellnessTheme.TealDeep
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { paddingValues ->
        when {
            uiState.isLoading && uiState.badges.isEmpty() -> {
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = WellnessTheme.TealPrimary)
                }
            }
            uiState.error != null && uiState.badges.isEmpty() -> {
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        modifier = Modifier.padding(24.dp),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(3.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Filled.ErrorOutline,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(Modifier.height(10.dp))
                            Text(
                                uiState.error ?: "Something went wrong",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                                fontSize = 14.sp
                            )
                            Spacer(Modifier.height(16.dp))
                            Button(
                                onClick = { viewModel.refreshBadges() },
                                colors = ButtonDefaults.buttonColors(containerColor = WellnessTheme.TealPrimary),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Retry", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
            badges.isEmpty() -> {
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = WellnessTheme.TealSurfaceVariant,
                            modifier = Modifier.size(80.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Filled.EmojiEvents,
                                    contentDescription = null,
                                    tint = WellnessTheme.StarYellow,
                                    modifier = Modifier.size(44.dp)
                                )
                            }
                        }
                        Text(
                            "No badges unlocked yet",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp,
                            color = WellnessTheme.TealDeep
                        )
                        Text(
                            "Earn badges and milestone points by completing daily workouts, hydration logs, and step targets!",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            lineHeight = 18.sp
                        )
                    }
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .background(MaterialTheme.colorScheme.background)
                ) {
                    // Header Banner with Gradient
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                            .shadow(6.dp, RoundedCornerShape(20.dp), spotColor = WellnessTheme.TealPrimary.copy(alpha = 0.3f)),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(WellnessTheme.HeroGradient)
                                .padding(20.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        "WELLNESS MILESTONES",
                                        color = WellnessTheme.TealMint,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        letterSpacing = 1.sp
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        "$unlockedCount of ${badges.size} Badges Unlocked",
                                        color = Color.White,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.ExtraBold
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    val totalProgress = if (badges.isNotEmpty()) {
                                        (unlockedCount.toFloat() / badges.size.toFloat()).coerceIn(0f, 1f)
                                    } else 0f
                                    LinearProgressIndicator(
                                        progress = { totalProgress },
                                        modifier = Modifier
                                            .fillMaxWidth(0.9f)
                                            .height(6.dp)
                                            .clip(RoundedCornerShape(3.dp)),
                                        color = WellnessTheme.TealMint,
                                        trackColor = Color.White.copy(alpha = 0.2f)
                                    )
                                }

                                Surface(
                                    shape = CircleShape,
                                    color = Color.White.copy(alpha = 0.15f),
                                    modifier = Modifier.size(54.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            Icons.Filled.EmojiEvents,
                                            contentDescription = null,
                                            tint = WellnessTheme.StarYellow,
                                            modifier = Modifier.size(32.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        contentPadding = PaddingValues(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        items(
                            count = badges.size,
                            key = { index -> "${badges[index].id}_${badges[index].code}_$index" }
                        ) { index ->
                            BadgeItemCard(badges[index])
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BadgeItemCard(badge: BadgeUi) {
    val accent = if (badge.isUnlocked) categoryColor(badge.category) else Color(0xFF94A3B8)
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = if (badge.isUnlocked) 4.dp else 1.dp,
                shape = RoundedCornerShape(18.dp),
                spotColor = accent.copy(alpha = 0.3f)
            ),
        shape = RoundedCornerShape(18.dp),
        color = if (badge.isUnlocked) Color.White else Color(0xFFF8FAFC),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (badge.isUnlocked) accent.copy(alpha = 0.35f) else Color(0xFFE2E8F0)
        )
    ) {
        Column(
            modifier = Modifier
                .padding(14.dp)
                .fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(58.dp)
                        .clip(CircleShape)
                        .background(if (badge.isUnlocked) accent.copy(alpha = 0.12f) else Color(0xFFF1F5F9))
                        .border(1.5.dp, if (badge.isUnlocked) accent else Color(0xFFCBD5E1), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (badge.icon.isNotBlank() && badge.icon.length <= 4) {
                        Text(badge.icon, fontSize = 24.sp)
                    } else {
                        Icon(
                            Icons.Filled.EmojiEvents,
                            contentDescription = null,
                            tint = if (badge.isUnlocked) accent else Color(0xFF94A3B8),
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }

                Text(
                    text = badge.name,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = if (badge.isUnlocked) WellnessTheme.TealDeep else Color(0xFF64748B)
                )

                if (badge.category.isNotBlank()) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = accent.copy(alpha = 0.1f)
                    ) {
                        Text(
                            text = badge.category.uppercase(),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = accent,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Text(
                    text = badge.description,
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    lineHeight = 14.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(Modifier.height(8.dp))

            if (badge.isUnlocked) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    if (badge.earnedAt.isNotBlank()) {
                        Text(
                            text = formatEarnedDate(badge.earnedAt),
                            fontSize = 9.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(2.dp))
                    }
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = WellnessTheme.SuccessGreen.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = "UNLOCKED ✓",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF047857),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            } else {
                if (badge.progress > 0f) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        val safeProgress = badge.progress.coerceIn(0f, 1f)
                        LinearProgressIndicator(
                            progress = { safeProgress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(5.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = WellnessTheme.TealPrimary,
                            trackColor = Color(0xFFE2E8F0)
                        )
                        Text(
                            text = "${(safeProgress * 100).toInt()}% Done",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF64748B)
                        )
                    }
                } else {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFFF1F5F9)
                    ) {
                        Text(
                            text = "LOCKED 🔒",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }
}

private fun JsonObject.toBadgeUi(index: Int): BadgeUi {
    val badgeObj = if (has("badge") && !get("badge").isJsonNull && get("badge").isJsonObject) {
        getAsJsonObject("badge")
    } else null

    val id = optStr("id") ?: badgeObj?.optStr("id") ?: "badge_$index"
    val code = optStr("code") ?: badgeObj?.optStr("code") ?: "code_$index"
    val name = optStr("name") ?: optStr("title") ?: badgeObj?.optStr("name") ?: badgeObj?.optStr("title") ?: "Badge #${index + 1}"
    val description = optStr("description") ?: badgeObj?.optStr("description").orEmpty()
    val category = optStr("category") ?: badgeObj?.optStr("category") ?: "Fitness"
    val icon = optStr("icon") ?: badgeObj?.optStr("icon").orEmpty()
    val earnedAt = optStr("earned_at").orEmpty()

    val isUnlocked = when {
        has("is_earned") && !get("is_earned").isJsonNull && get("is_earned").isJsonPrimitive -> {
            try { get("is_earned").asBoolean } catch (_: Exception) { false }
        }
        has("is_unlocked") && !get("is_unlocked").isJsonNull && get("is_unlocked").isJsonPrimitive -> {
            try { get("is_unlocked").asBoolean } catch (_: Exception) { false }
        }
        else -> earnedAt.isNotBlank()
    }

    val progress = when {
        has("progress_percent") && !get("progress_percent").isJsonNull && get("progress_percent").isJsonPrimitive -> {
            try { (get("progress_percent").asFloat / 100f).coerceIn(0f, 1f) } catch (_: Exception) { if (isUnlocked) 1f else 0f }
        }
        has("progress") && !get("progress").isJsonNull && get("progress").isJsonPrimitive -> {
            try { get("progress").asFloat.coerceIn(0f, 1f) } catch (_: Exception) { if (isUnlocked) 1f else 0f }
        }
        else -> if (isUnlocked) 1f else 0f
    }

    return BadgeUi(id, code, name, description, category, icon, earnedAt, isUnlocked, progress)
}

private fun JsonObject.optStr(key: String): String? =
    if (has(key) && !get(key).isJsonNull && get(key).isJsonPrimitive) get(key).asString else null

private fun categoryColor(category: String?): Color {
    val c = category ?: return WellnessTheme.NutritionBlue
    return when (c.lowercase()) {
        "fitness", "workout", "exercise", "strength" -> WellnessTheme.FitnessCoral
        "hydration", "nutrition", "diet" -> WellnessTheme.NutritionBlue
        "mindfulness", "meditation", "yoga" -> WellnessTheme.YogaAmber
        "steps", "activity", "walking" -> WellnessTheme.TealPrimary
        "sleep" -> Color(0xFF6366F1)
        else -> WellnessTheme.TealPrimary
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
