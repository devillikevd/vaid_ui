package com.example.swastik.ui.screens.patient.wellness

import android.content.Intent
import android.widget.Toast
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
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.swastik.data.remote.dto.GroupPostDto
import com.example.swastik.data.remote.dto.LeaderboardEntryDto
import com.example.swastik.data.remote.dto.WellnessChallengeDto
import com.example.swastik.data.remote.dto.WellnessGroupDto
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealDark
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealDeep
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealMint
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealPrimary
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealSurface
import com.example.swastik.ui.viewmodel.WellnessViewModel
import com.google.gson.JsonObject
import kotlin.random.Random

private val GoldGradient = Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFFD97706)))
private val TealHeroGradient = Brush.linearGradient(listOf(Color(0xFF042F2E), Color(0xFF0F766E), Color(0xFF115E59)))
private val PurpleBadgeGradient = Brush.horizontalGradient(listOf(Color(0xFF7C3AED), Color(0xFF6D28D9)))

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessCommunityScreen(
    onNavigateBack: () -> Unit,
    viewModel: WellnessViewModel
) {
    val context = LocalContext.current
    val state by viewModel.uiState.collectAsState()

    // Interactive Sheets
    var selectedGroupForDetail by remember { mutableStateOf<WellnessGroupDto?>(null) }
    var celebrationData by remember { mutableStateOf<CelebrationPayload?>(null) }

    LaunchedEffect(Unit) {
        viewModel.refreshCommunity()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Community Tribes & Circles",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = TealDeep,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = TealDeep
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        viewModel.refreshCommunity()
                        Toast.makeText(context, "Community tribes updated", Toast.LENGTH_SHORT).show()
                    }) {
                        Icon(Icons.Default.Refresh, "Refresh", tint = TealPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = TealSurface
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            CommunitiesTab(
                groups = state.groups,
                onGroupClick = { selectedGroupForDetail = it },
                onJoinGroup = { group ->
                    viewModel.joinCommunityGroup(group.id) { success, msg ->
                        Toast.makeText(context, msg ?: if (success) "Joined community!" else "Failed to join", Toast.LENGTH_SHORT).show()
                        if (success) {
                            celebrationData = CelebrationPayload(
                                title = "Community Circle Joined! 👥",
                                subtitle = "Welcome to ${group.name}. Start posting daily accountability check-ins!",
                                iconEmoji = "🤝",
                                xpEarned = 50,
                                medcoinsEarned = 25
                            )
                        }
                    }
                }
            )
        }
    }

    // BottomSheet 1: Group Details & Social Feed
    selectedGroupForDetail?.let { group ->
        GroupDetailBottomSheet(
            group = group,
            viewModel = viewModel,
            onDismiss = { selectedGroupForDetail = null },
            onJoinGroup = {
                viewModel.joinCommunityGroup(group.id) { success, msg ->
                    Toast.makeText(context, msg ?: if (success) "Joined!" else "Failed", Toast.LENGTH_SHORT).show()
                    if (success) {
                        celebrationData = CelebrationPayload(
                            title = "Community Circle Joined! 👥",
                            subtitle = "Welcome to ${group.name}. Start posting daily accountability check-ins!",
                            iconEmoji = "🤝",
                            xpEarned = 50,
                            medcoinsEarned = 25
                        )
                    }
                }
            }
        )
    }

    // Confetti & Trophy Celebration Modal
    celebrationData?.let { data ->
        MilestoneCelebrationDialog(
            payload = data,
            onDismiss = { celebrationData = null }
        )
    }
}

data class CelebrationPayload(
    val title: String,
    val subtitle: String,
    val iconEmoji: String,
    val xpEarned: Int,
    val medcoinsEarned: Int
)

// ==========================================
// STATUS BAR: LEVEL, XP & STREAK
// ==========================================

@Composable
private fun GamificationStatusBar(
    streakDays: Int,
    currentXp: Int,
    targetXp: Int,
    level: Int,
    medcoins: Int
) {
    Surface(
        color = Color(0xFF042F2E),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("⭐ Level $level Explorer", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFFFDE68A))
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF134E4A)) {
                        Text(
                            "$currentXp / $targetXp XP",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF5EEAD4),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🔥 $streakDays Days", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFFB923C))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("🪙 $medcoins", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFFBBF24))
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Smooth XP Bar
            val progress = (currentXp.toFloat() / targetXp.toFloat()).coerceIn(0f, 1f)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(Color(0xFF134E4A))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(progress)
                        .background(GoldGradient)
                )
            }
        }
    }
}

// ==========================================
// TAB 0: COMMUNITIES & GOAL CIRCLES
// ==========================================

@Composable
private fun CommunitiesTab(
    groups: List<WellnessGroupDto>,
    onGroupClick: (WellnessGroupDto) -> Unit,
    onJoinGroup: (WellnessGroupDto) -> Unit
) {
    var selectedGoalFilter by remember { mutableStateOf("All") }
    val goalFilters = listOf("All", "Weight Loss", "Yoga", "Beginner", "PCOS", "Strength", "Senior")

    val filteredGroups = remember(groups, selectedGoalFilter) {
        if (selectedGoalFilter == "All") groups
        else groups.filter {
            (it.goalTag ?: "").contains(selectedGoalFilter, ignoreCase = true) ||
            it.name.contains(selectedGoalFilter, ignoreCase = true)
        }
    }

    val joinedGroups = remember(groups) { groups.filter { it.isJoined == true } }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // My Joined Circles Section
        if (joinedGroups.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "🌟 My Joined Circles (${joinedGroups.size})",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = TealDeep
                        )
                        Text(
                            "Tap to open feed",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(joinedGroups, key = { "joined_${it.id}" }) { group ->
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = Color.White,
                                border = androidx.compose.foundation.BorderStroke(1.5.dp, TealPrimary),
                                modifier = Modifier
                                    .width(220.dp)
                                    .clickable { onGroupClick(group) }
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Surface(
                                            shape = RoundedCornerShape(6.dp),
                                            color = TealMint.copy(alpha = 0.6f)
                                        ) {
                                            Text(
                                                "JOINED ✓",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = TealDark,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                        Text(
                                            "💬 Feed",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TealPrimary
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        group.name,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TealDeep,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        "👥 ${group.memberCount ?: 120} members",
                                        fontSize = 10.5.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Goal Filter Chips
        item {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 4.dp)
            ) {
                items(goalFilters) { filter ->
                    val isSelected = selectedGoalFilter == filter
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedGoalFilter = filter },
                        label = {
                            Text(
                                filter,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                fontSize = 12.sp
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = TealDark,
                            selectedLabelColor = Color.White,
                            containerColor = Color.White,
                            labelColor = TealDeep
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = isSelected,
                            borderColor = if (isSelected) TealDark else TealMint
                        )
                    )
                }
            }
        }

        if (filteredGroups.isEmpty()) {
            item {
                CommunityEmptyState(
                    icon = Icons.Default.Groups,
                    title = "No Communities Found",
                    message = "No circles match this filter. Try selecting 'All' to browse all active goals.",
                    color = TealPrimary
                )
            }
        } else {
            items(filteredGroups, key = { it.id }) { group ->
                GroupCard(
                    group = group,
                    onClick = { onGroupClick(group) },
                    onJoinClick = { onJoinGroup(group) }
                )
            }
        }
    }
}

@Composable
private fun GroupCard(
    group: WellnessGroupDto,
    onClick: () -> Unit,
    onJoinClick: () -> Unit
) {
    val isJoined = group.isJoined == true
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header Row: Goal Tag & City
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = TealMint.copy(alpha = 0.6f)
                ) {
                    Text(
                        (group.goalTag ?: "Wellness").replace("_", " ").uppercase(),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TealDark,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Place, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(
                        group.city ?: "All India",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Title
            Text(
                group.name,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                color = TealDeep
            )

            group.description?.let {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    it,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Coach Row - clean single line
            group.hostCoachName?.let { coachName ->
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("👨‍⚕️", fontSize = 13.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        coachName,
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = TealDeep
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(Icons.Default.Verified, null, tint = TealPrimary, modifier = Modifier.size(13.dp))
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = Color(0xFFF1F5F9))
            Spacer(modifier = Modifier.height(10.dp))

            // Footer Row: Members on left, Action Button on right
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("👥", fontSize = 13.sp)
                    Spacer(modifier = Modifier.width(5.dp))
                    Text(
                        "${group.memberCount ?: 120} members",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = if (isJoined) TealMint else TealPrimary,
                    modifier = Modifier.clickable {
                        if (isJoined) onClick() else onJoinClick()
                    }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isJoined) Icons.Default.ChatBubbleOutline else Icons.Default.Add,
                            contentDescription = null,
                            tint = if (isJoined) TealDark else Color.White,
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            if (isJoined) "Enter Circle ➔" else "+ Join Circle",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (isJoined) TealDark else Color.White,
                            maxLines = 1,
                            softWrap = false
                        )
                    }
                }
            }
        }
    }
}

// ==========================================
// TAB 1: CHALLENGES & LIVE LEADERBOARDS
// ==========================================

@Composable
private fun ChallengesTab(
    challenges: List<WellnessChallengeDto>,
    onChallengeClick: (WellnessChallengeDto) -> Unit,
    onJoinChallenge: (WellnessChallengeDto) -> Unit,
    onOpenLeaderboard: (WellnessChallengeDto) -> Unit
) {
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero Featured Challenge Card (Top Challenge)
        if (challenges.isNotEmpty()) {
            val heroChallenge = challenges.first()
            item {
                HeroChallengeBanner(
                    challenge = heroChallenge,
                    onOpenLeaderboard = { onOpenLeaderboard(heroChallenge) },
                    onJoinChallenge = { onJoinChallenge(heroChallenge) }
                )
            }
        }

        item {
            Text(
                "Active Sprints & Habit Contests",
                fontWeight = FontWeight.Black,
                fontSize = 16.sp,
                color = TealDeep
            )
        }

        if (challenges.isEmpty()) {
            item {
                CommunityEmptyState(
                    icon = Icons.Default.EmojiEvents,
                    title = "No Active Challenges",
                    message = "Check back soon for new step sprints and yoga streaks!",
                    color = Color(0xFFF59E0B)
                )
            }
        } else {
            items(challenges.drop(1), key = { it.id }) { challenge ->
                ChallengeCard(
                    challenge = challenge,
                    onClick = { onChallengeClick(challenge) },
                    onJoinClick = { onJoinChallenge(challenge) },
                    onLeaderboardClick = { onOpenLeaderboard(challenge) }
                )
            }
        }
    }
}

@Composable
private fun HeroChallengeBanner(
    challenge: WellnessChallengeDto,
    onOpenLeaderboard: () -> Unit,
    onJoinChallenge: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = Color.Transparent,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(TealHeroGradient)
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFF59E0B)
                ) {
                    Text(
                        "🔥 FEATURED SPRINT",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF042F2E),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color.White.copy(alpha = 0.15f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("⏳ 7 Days Left", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                challenge.title,
                fontWeight = FontWeight.Black,
                fontSize = 20.sp,
                color = Color.White
            )

            challenge.description?.let {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    it,
                    fontSize = 12.sp,
                    color = Color(0xFFCCFBF1),
                    maxLines = 2
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Progress bar
            val progressPercent = challenge.progressPercent ?: 60
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        "Your Progress: ${challenge.progressValue?.toInt() ?: 42000} / ${challenge.targetValue?.toInt() ?: 70000} ${challenge.targetUnit ?: "Steps"}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF5EEAD4)
                    )
                    Text(
                        "$progressPercent%",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFFDE68A)
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color.White.copy(alpha = 0.2f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progressPercent / 100f)
                            .background(GoldGradient)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action Row: Bounty on top, Buttons below with full width
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Bounty pill
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🏆 +${challenge.rewardMedCoins ?: 100} Coins", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFFBBF24))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("• +${challenge.rewardXp ?: 250} XP", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF5EEAD4))
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onOpenLeaderboard,
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.2f)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp)
                    ) {
                        Text("🏅 Podium", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 1, softWrap = false)
                    }

                    val isJoined = challenge.isJoined == true
                    Button(
                        onClick = onJoinChallenge,
                        colors = ButtonDefaults.buttonColors(containerColor = if (isJoined) Color(0xFF5EEAD4) else Color(0xFFF59E0B)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1.2f),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text(
                            if (isJoined) "Joined ✓" else "Join Sprint",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF042F2E),
                            maxLines = 1,
                            softWrap = false
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ChallengeCard(
    challenge: WellnessChallengeDto,
    onClick: () -> Unit,
    onJoinClick: () -> Unit,
    onLeaderboardClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = when (challenge.challengeType?.lowercase()) {
                        "steps" -> Color(0xFFFEF3C7)
                        "yoga" -> Color(0xFFEDE9FE)
                        "cardio" -> Color(0xFFFFEDD5)
                        else -> TealMint
                    }
                ) {
                    Text(
                        (challenge.challengeType ?: "Fitness").uppercase(),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = when (challenge.challengeType?.lowercase()) {
                            "steps" -> Color(0xFFD97706)
                            "yoga" -> Color(0xFF7C3AED)
                            "cardio" -> Color(0xFFEA580C)
                            else -> TealDark
                        },
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }

                Text(
                    "👥 ${challenge.participantCount ?: 180} Athletes",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                challenge.title,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                color = TealDeep
            )
            challenge.description?.let {
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    it,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Target & Reward Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                    .padding(10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Target Metric", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "${challenge.targetValue?.toInt() ?: 100} ${challenge.targetUnit ?: "Units"}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TealDeep
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text("Bounty Rewards", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "🏆 +${challenge.rewardMedCoins ?: 100} Coins • +${challenge.rewardXp ?: 250} XP",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFFD97706)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Action Row: Leaderboard + Join Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFFEF3C7),
                    modifier = Modifier.clickable { onLeaderboardClick() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("🏅", fontSize = 12.sp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "Leaderboard",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF92400E)
                        )
                    }
                }

                val isJoined = challenge.isJoined == true
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isJoined) TealMint else TealPrimary,
                    modifier = Modifier.clickable { onJoinClick() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isJoined) Icons.Default.Check else Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = if (isJoined) TealDark else Color.White,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            if (isJoined) "Joined" else "Join Sprint",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (isJoined) TealDark else Color.White
                        )
                    }
                }
            }
        }
    }
}

// ==========================================
// TAB 2: TROPHY ROOM & GAMIFICATION BADGES
// ==========================================

@Composable
private fun TrophyRoomTab(
    badges: List<JsonObject>,
    onBadgeClick: (JsonObject) -> Unit
) {
    val masterBadges = remember(badges) {
        if (badges.isNotEmpty()) badges
        else listOf(
            JsonObject().apply {
                addProperty("id", "badge-1")
                addProperty("name", "First Sweat Milestone")
                addProperty("description", "Completed first verified workout session")
                addProperty("badge_type", "beginner")
                addProperty("icon_url", "🏋️")
                addProperty("reward_xp", 100)
                addProperty("is_earned", true)
                addProperty("earned_at", "2026-08-15")
            },
            JsonObject().apply {
                addProperty("id", "badge-2")
                addProperty("name", "7-Day Streak Master")
                addProperty("description", "Maintained 7 consecutive active workout days")
                addProperty("badge_type", "consistency")
                addProperty("icon_url", "🔥")
                addProperty("reward_xp", 250)
                addProperty("is_earned", true)
                addProperty("earned_at", "2026-08-18")
            },
            JsonObject().apply {
                addProperty("id", "badge-3")
                addProperty("name", "10K Steps Sprint Champ")
                addProperty("description", "Achieved 10,000 daily steps in contest sprint")
                addProperty("badge_type", "steps")
                addProperty("icon_url", "👟")
                addProperty("reward_xp", 300)
                addProperty("is_earned", true)
                addProperty("earned_at", "2026-08-17")
            },
            JsonObject().apply {
                addProperty("id", "badge-4")
                addProperty("name", "Cellular Detox Master")
                addProperty("description", "Logged 3.5L hydration for 7 straight days")
                addProperty("badge_type", "hydration")
                addProperty("icon_url", "💧")
                addProperty("reward_xp", 150)
                addProperty("is_earned", false)
                addProperty("progress_text", "5/7 Days Logged")
                addProperty("progress_percent", 71)
            },
            JsonObject().apply {
                addProperty("id", "badge-5")
                addProperty("name", "Flexibility & Zen Guru")
                addProperty("description", "Completed 10 restorative yoga & mobility classes")
                addProperty("badge_type", "yoga")
                addProperty("icon_url", "🧘")
                addProperty("reward_xp", 200)
                addProperty("is_earned", false)
                addProperty("progress_text", "6/10 Sessions")
                addProperty("progress_percent", 60)
            },
            JsonObject().apply {
                addProperty("id", "badge-6")
                addProperty("name", "50K Century Walker")
                addProperty("description", "Accumulate 50,000 total steps in a single week")
                addProperty("badge_type", "endurance")
                addProperty("icon_url", "🏅")
                addProperty("reward_xp", 350)
                addProperty("is_earned", false)
                addProperty("progress_text", "42k / 50k Steps")
                addProperty("progress_percent", 84)
            },
            JsonObject().apply {
                addProperty("id", "badge-7")
                addProperty("name", "Weekend Cardio Beast")
                addProperty("description", "Log 180 total active minutes in one weekend")
                addProperty("badge_type", "cardio")
                addProperty("icon_url", "🛡️")
                addProperty("reward_xp", 200)
                addProperty("is_earned", false)
                addProperty("progress_text", "90 / 180 Mins")
                addProperty("progress_percent", 50)
            },
            JsonObject().apply {
                addProperty("id", "badge-8")
                addProperty("name", "Iron Habit 30-Day Master")
                addProperty("description", "30 consecutive active days of verified fitness")
                addProperty("badge_type", "master")
                addProperty("icon_url", "👑")
                addProperty("reward_xp", 500)
                addProperty("is_earned", false)
                addProperty("progress_text", "7 / 30 Days")
                addProperty("progress_percent", 23)
            }
        )
    }

    val earnedCount = masterBadges.count { it.get("is_earned")?.asBoolean == true }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Trophy Hall Header Banner
        item {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFF4C1D95),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("👑 Trophy Room", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color(0xFFFDE68A))
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            "$earnedCount of ${masterBadges.size} Milestones Unlocked",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFE9D5FF)
                        )
                    }

                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFF59E0B),
                        modifier = Modifier.size(44.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("🏆", fontSize = 22.sp)
                        }
                    }
                }
            }
        }

        items(masterBadges, key = { it.get("id")?.asString ?: Random.nextInt().toString() }) { badge ->
            TrophyBadgeCard(
                badge = badge,
                onClick = { onBadgeClick(badge) }
            )
        }
    }
}

@Composable
private fun TrophyBadgeCard(
    badge: JsonObject,
    onClick: () -> Unit
) {
    val name = badge.get("name")?.asString ?: "Badge"
    val description = badge.get("description")?.asString ?: ""
    val isEarned = badge.get("is_earned")?.asBoolean == true
    val earnedAt = badge.get("earned_at")?.asString
    val badgeIconEmoji = badge.get("icon_url")?.asString ?: (if (isEarned) "🏆" else "🔒")
    val progressText = badge.get("progress_text")?.asString ?: "In Progress"
    val progressPercent = badge.get("progress_percent")?.asInt ?: 50

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isEarned) Color(0xFFFFFBEB) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isEarned) 3.dp else 1.dp),
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (isEarned) Modifier.border(1.5.dp, Color(0xFFF59E0B).copy(alpha = 0.6f), RoundedCornerShape(18.dp))
                else Modifier.border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(18.dp))
            )
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Badge Avatar
            Surface(
                shape = CircleShape,
                color = if (isEarned) Color(0xFFFEF3C7) else Color(0xFFF1F5F9),
                modifier = Modifier
                    .size(56.dp)
                    .then(
                        if (isEarned) Modifier.border(2.dp, Color(0xFFF59E0B), CircleShape)
                        else Modifier
                    )
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        badgeIconEmoji,
                        fontSize = 28.sp
                    )
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            // Info Column
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        name,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 15.sp,
                        color = if (isEarned) TealDeep else Color(0xFF64748B)
                    )

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (isEarned) Color(0xFFD1FAE5) else Color(0xFFE2E8F0)
                    ) {
                        Text(
                            if (isEarned) "UNLOCKED ✓" else "LOCKED 🔒",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (isEarned) Color(0xFF047857) else Color(0xFF64748B),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                if (description.isNotBlank()) {
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        description,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Progress Bar or Earned Tag
                if (isEarned) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("✨", fontSize = 11.sp)
                        Text(
                            "Earned: ${earnedAt?.take(10) ?: "Active Milestone"}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFD97706)
                        )
                    }
                } else {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                progressText,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                "$progressPercent%",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF7C3AED)
                            )
                        }
                        Spacer(modifier = Modifier.height(3.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(5.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(Color(0xFFE2E8F0))
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth(progressPercent / 100f)
                                    .background(PurpleBadgeGradient)
                            )
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// BOTTOMSHEET 1: GROUP DETAILS & SOCIAL FEED
// ==========================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GroupDetailBottomSheet(
    group: WellnessGroupDto,
    viewModel: WellnessViewModel,
    onDismiss: () -> Unit,
    onJoinGroup: () -> Unit
) {
    var selectedSheetTab by remember(group.isJoined) {
        mutableIntStateOf(if (group.isJoined == true) 1 else 0)
    }
    val groupPosts by viewModel.groupPosts.collectAsState()
    val isPostingCheckin by viewModel.isPostingCheckin.collectAsState()

    var checkInContent by remember { mutableStateOf("") }
    var checkInTag by remember { mutableStateOf("🏋️ Workout Check-in") }

    LaunchedEffect(group.id) {
        viewModel.loadGroupPosts(group.id)
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = TealMint
                ) {
                    Text(
                        (group.goalTag ?: "Wellness").uppercase(),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TealDark,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }

                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, null, tint = TealDeep)
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                group.name,
                fontWeight = FontWeight.Black,
                fontSize = 20.sp,
                color = TealDeep
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Sub-tabs: [About & Rules] and [Circle Feed 💬]
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                    .padding(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (selectedSheetTab == 0) Color.White else Color.Transparent)
                        .clickable { selectedSheetTab = 0 }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "About & Rules",
                        fontSize = 12.sp,
                        fontWeight = if (selectedSheetTab == 0) FontWeight.ExtraBold else FontWeight.Medium,
                        color = if (selectedSheetTab == 0) TealDeep else Color(0xFF64748B)
                    )
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (selectedSheetTab == 1) Color.White else Color.Transparent)
                        .clickable { selectedSheetTab = 1 }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Circle Feed 💬",
                        fontSize = 12.sp,
                        fontWeight = if (selectedSheetTab == 1) FontWeight.ExtraBold else FontWeight.Medium,
                        color = if (selectedSheetTab == 1) TealDeep else Color(0xFF64748B)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            if (selectedSheetTab == 0) {
                // ABOUT & STANDARDS
                group.description?.let {
                    Text(it, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(14.dp))
                }

                group.hostCoachName?.let { coachName ->
                    Text("Host & Verified Specialist", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TealDeep)
                    Spacer(modifier = Modifier.height(6.dp))
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = TealSurface,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(shape = CircleShape, color = TealDark, modifier = Modifier.size(36.dp)) {
                                Box(contentAlignment = Alignment.Center) { Text("👨‍⚕️", fontSize = 18.sp) }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(coachName, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, color = TealDeep)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Icon(Icons.Default.Verified, null, tint = TealPrimary, modifier = Modifier.size(13.dp))
                                }
                                Text("Provides daily habit guidance & nutrition advice", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                }

                Text("Community Standards", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TealDeep)
                Spacer(modifier = Modifier.height(6.dp))
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    GuidelineRow("🤝 Zero judgment, 100% supportive atmosphere")
                    GuidelineRow("🥗 Daily meal & workout accountability posts")
                    GuidelineRow("🚫 Strictly no unverified supplement promotion")
                }

                Spacer(modifier = Modifier.height(20.dp))

                val isJoined = group.isJoined == true
                Button(
                    onClick = {
                        onJoinGroup()
                        onDismiss()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isJoined) TealDark else TealPrimary
                    )
                ) {
                    Text(
                        if (isJoined) "You are already a member ✓" else "Join This Community 🚀",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Color.White
                    )
                }
            } else {
                // SOCIAL FEED TAB
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Pinned Coach Daily Tip
                    group.recentTip?.let { tip ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFFEF3C7), RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Text("💡", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text("Coach Daily Advice", fontWeight = FontWeight.ExtraBold, fontSize = 11.sp, color = Color(0xFF92400E))
                                Text(tip, fontSize = 12.sp, color = Color(0xFF78350F), fontWeight = FontWeight.Medium)
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // Check-in Creator Box
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color(0xFFF8FAFC),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Post Daily Check-in", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TealDeep)
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = TealMint,
                                    modifier = Modifier.clickable {
                                        checkInTag = if (checkInTag.contains("Workout")) "🥗 Meal Check-in" else "🏋️ Workout Check-in"
                                    }
                                ) {
                                    Text(checkInTag, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TealDark, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            OutlinedTextField(
                                value = checkInContent,
                                onValueChange = { checkInContent = it },
                                placeholder = { Text("Log your workout or healthy meal victory...", fontSize = 12.sp) },
                                modifier = Modifier.fillMaxWidth(),
                                maxLines = 2,
                                shape = RoundedCornerShape(10.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.End
                            ) {
                                Button(
                                    onClick = {
                                        if (checkInContent.isNotBlank()) {
                                            viewModel.postCheckIn(group.id, checkInContent.trim(), checkInTag) {
                                                checkInContent = ""
                                            }
                                        }
                                    },
                                    enabled = checkInContent.isNotBlank() && !isPostingCheckin,
                                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp)
                                ) {
                                    Text("Post Check-in (+15 XP)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Feed Posts List
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 300.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(groupPosts, key = { it.id }) { post ->
                            GroupPostItem(
                                post = post,
                                onCheer = { viewModel.cheerPost(post.id) }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun GroupPostItem(
    post: GroupPostDto,
    onCheer: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color(0xFFF8FAFC),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = CircleShape, color = TealDark, modifier = Modifier.size(28.dp)) {
                        Box(contentAlignment = Alignment.Center) { Text("👤", fontSize = 12.sp) }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(post.authorName ?: "Athlete", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TealDeep)
                        Text(post.authorRole ?: "Member", fontSize = 10.sp, color = TealPrimary, fontWeight = FontWeight.SemiBold)
                    }
                }

                Surface(shape = RoundedCornerShape(6.dp), color = TealMint.copy(alpha = 0.5f)) {
                    Text(post.workoutTag ?: "🏃 Check-in", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TealDark, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(post.content, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    post.createdAt?.take(16)?.replace("T", " ") ?: "Today",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (post.isCheered) Color(0xFFFFEDD5) else Color.White,
                    border = androidx.compose.foundation.BorderStroke(1.dp, if (post.isCheered) Color(0xFFF97316) else Color(0xFFCBD5E1)),
                    modifier = Modifier.clickable { onCheer() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("🔥", fontSize = 11.sp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "Cheer (${post.cheersCount})",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (post.isCheered) Color(0xFFC2410C) else TealDeep
                        )
                    }
                }
            }
        }
    }
}

// ==========================================
// BOTTOMSHEET 2: PODIUM LEADERBOARD
// ==========================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChallengeLeaderboardBottomSheet(
    challenge: WellnessChallengeDto,
    viewModel: WellnessViewModel,
    onDismiss: () -> Unit
) {
    var leaderboardEntries by remember { mutableStateOf<List<LeaderboardEntryDto>>(emptyList()) }
    var isLoadingLeaderboard by remember { mutableStateOf(true) }

    LaunchedEffect(challenge.id) {
        isLoadingLeaderboard = true
        leaderboardEntries = viewModel.getChallengeLeaderboard(challenge.id)
        isLoadingLeaderboard = false
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🏅", fontSize = 20.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Live Challenge Leaderboard",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = TealDeep
                    )
                }

                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, null, tint = TealDeep)
                }
            }

            Text(
                challenge.title,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (isLoadingLeaderboard) {
                Box(
                    modifier = Modifier.fillMaxWidth().height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = TealPrimary)
                }
            } else {
                // TOP 3 PODIUM
                val top1 = leaderboardEntries.getOrNull(0)
                val top2 = leaderboardEntries.getOrNull(1)
                val top3 = leaderboardEntries.getOrNull(2)

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.Bottom
                ) {
                    // Rank 2: Silver
                    PodiumColumn(
                        rank = 2,
                        name = top2?.displayName ?: "Sneha R.",
                        score = "${top2?.score?.toInt() ?: 58200} Steps",
                        medalEmoji = "🥈",
                        crownColor = Color(0xFF94A3B8),
                        height = 90.dp
                    )

                    // Rank 1: Gold (Highest)
                    PodiumColumn(
                        rank = 1,
                        name = top1?.displayName ?: "Amit S.",
                        score = "${top1?.score?.toInt() ?: 64500} Steps",
                        medalEmoji = "🥇",
                        crownColor = Color(0xFFF59E0B),
                        height = 115.dp
                    )

                    // Rank 3: Bronze
                    PodiumColumn(
                        rank = 3,
                        name = top3?.displayName ?: "Rahul V.",
                        score = "${top3?.score?.toInt() ?: 51000} Steps",
                        medalEmoji = "🥉",
                        crownColor = Color(0xFFD97706),
                        height = 75.dp
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text("Full Rankings", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TealDeep)
                Spacer(modifier = Modifier.height(8.dp))

                val restEntries = if (leaderboardEntries.size > 3) leaderboardEntries.drop(3) else emptyList()
                if (restEntries.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        restEntries.take(7).forEach { entry ->
                            LeaderboardRankRow(
                                rank = entry.rank,
                                name = entry.displayName,
                                score = "${entry.score.toInt()} ${entry.displayUnit}",
                                isSelf = entry.isSelf
                            )
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        LeaderboardRankRow(rank = 4, name = "Pooja Nair", score = "47,800 Steps", isSelf = false)
                        LeaderboardRankRow(rank = 5, name = "Vikas Joshi", score = "42,300 Steps", isSelf = false)
                        LeaderboardRankRow(rank = 6, name = "Anjali Sharma", score = "39,100 Steps", isSelf = false)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Sticky Standing Card
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = TealSurface,
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.5.dp, TealPrimary, RoundedCornerShape(16.dp))
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(shape = CircleShape, color = TealPrimary, modifier = Modifier.size(36.dp)) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text("👤", fontSize = 18.sp)
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Rank #12 (You)", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = TealDeep)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(shape = RoundedCornerShape(6.dp), color = TealMint) {
                                        Text("ACTIVE", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = TealDark, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                    }
                                }
                                Text("42,000 / 70,000 Steps", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }

                        Text(
                            "⚡ +3.2k to Top 10",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFFEA580C)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }
}

@Composable
private fun PodiumColumn(
    rank: Int,
    name: String,
    score: String,
    medalEmoji: String,
    crownColor: Color,
    height: androidx.compose.ui.unit.Dp
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(medalEmoji, fontSize = 24.sp)
        Text(name, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = TealDeep)
        Text(score, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(6.dp))
        Surface(
            shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
            color = crownColor.copy(alpha = 0.2f),
            modifier = Modifier
                .width(80.dp)
                .height(height)
                .border(1.dp, crownColor, RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    "#$rank",
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp,
                    color = crownColor
                )
            }
        }
    }
}

@Composable
private fun LeaderboardRankRow(
    rank: Int,
    name: String,
    score: String,
    isSelf: Boolean
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (isSelf) TealMint else Color(0xFFF8FAFC),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("#$rank", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TealDeep)
                Spacer(modifier = Modifier.width(12.dp))
                Text(name, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = TealDeep)
            }
            Text(score, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TealDark)
        }
    }
}

// ==========================================
// CELEBRATION & MICRO-ANIMATION CONFETTI MODAL
// ==========================================

@Composable
private fun MilestoneCelebrationDialog(
    payload: CelebrationPayload,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current

    // Spring scale animation
    val scaleAnim = remember { Animatable(0.4f) }
    LaunchedEffect(Unit) {
        scaleAnim.animateTo(
            targetValue = 1f,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )
        )
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.75f))
                .clickable { onDismiss() },
            contentAlignment = Alignment.Center
        ) {
            // Animated Canvas Confetti Particles
            ConfettiParticleCanvas()

            // Celebration Card
            Card(
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 16.dp),
                modifier = Modifier
                    .padding(32.dp)
                    .fillMaxWidth()
                    .scale(scaleAnim.value)
                    .clickable(enabled = false) {}
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Glowing Trophy Icon
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFFEF3C7),
                        modifier = Modifier
                            .size(90.dp)
                            .border(3.dp, Color(0xFFF59E0B), CircleShape)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(payload.iconEmoji, fontSize = 44.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        payload.title,
                        fontWeight = FontWeight.Black,
                        fontSize = 22.sp,
                        textAlign = TextAlign.Center,
                        color = TealDeep
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        payload.subtitle,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Rewards Bar
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color(0xFF042F2E),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 10.dp, horizontal = 16.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "🎖️ +${payload.xpEarned} XP Points",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFF5EEAD4)
                            )
                            Text("•", color = Color.White.copy(alpha = 0.5f))
                            Text(
                                "🪙 +${payload.medcoinsEarned} MedCoins",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFFFBBF24)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Action Buttons: Share & Done
                    Button(
                        onClick = {
                            val shareText = "🎉 Just unlocked milestone on Swastik: ${payload.title}! Earned +${payload.xpEarned} XP & +${payload.medcoinsEarned} MedCoins. Join the health sprint!"
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, shareText)
                            }
                            context.startActivity(Intent.createChooser(intent, "Share Milestone"))
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("📲", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Share to Story / WhatsApp", fontWeight = FontWeight.ExtraBold, color = Color(0xFF042F2E))
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    TextButton(onClick = onDismiss) {
                        Text("Continue Workout", fontWeight = FontWeight.Bold, color = TealDeep)
                    }
                }
            }
        }
    }
}

@Composable
private fun ConfettiParticleCanvas() {
    val infiniteTransition = rememberInfiniteTransition(label = "confetti")
    val animOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "confettiFloat"
    )

    val particles = remember {
        List(45) {
            ConfettiParticle(
                x = Random.nextFloat(),
                speed = 0.4f + Random.nextFloat() * 0.8f,
                size = 6f + Random.nextFloat() * 10f,
                color = when (it % 5) {
                    0 -> Color(0xFFF59E0B)
                    1 -> Color(0xFF10B981)
                    2 -> Color(0xFF3B82F6)
                    3 -> Color(0xFFEC4899)
                    else -> Color(0xFF8B5CF6)
                }
            )
        }
    }

    Canvas(modifier = Modifier.fillMaxSize()) {
        particles.forEach { p ->
            val yPos = ((p.speed * animOffset) % 1f) * size.height
            val xPos = p.x * size.width
            drawCircle(
                color = p.color,
                radius = p.size,
                center = Offset(xPos, yPos)
            )
        }
    }
}

private data class ConfettiParticle(
    val x: Float,
    val speed: Float,
    val size: Float,
    val color: Color
)

@Composable
private fun GuidelineRow(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("•", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TealPrimary)
        Spacer(modifier = Modifier.width(8.dp))
        Text(text, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun CommunityEmptyState(icon: ImageVector, title: String, message: String, color: Color) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Surface(shape = CircleShape, color = color.copy(alpha = 0.1f), modifier = Modifier.size(80.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(40.dp))
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = TealDeep)
            Spacer(modifier = Modifier.height(8.dp))
            Text(message, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        }
    }
}
