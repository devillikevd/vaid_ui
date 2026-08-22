package com.example.swastik.ui.screens.patient.wellness

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
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.swastik.data.remote.dto.LeaderboardEntryDto
import com.example.swastik.data.remote.dto.WellnessChallengeDto
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealDark
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealDeep
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealMint
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealPrimary
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealSurface
import com.example.swastik.ui.viewmodel.WellnessViewModel
import com.google.gson.JsonObject

private val GoldGradient = Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFFD97706)))
private val ChallengeHeroGradient = Brush.linearGradient(listOf(Color(0xFF042F2E), Color(0xFF0F766E), Color(0xFF115E59)))

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessChallengesScreen(
    onNavigateBack: () -> Unit,
    viewModel: WellnessViewModel
) {
    val context = LocalContext.current
    val state by viewModel.uiState.collectAsState()

    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Active Sprints", "Trophy Room")

    // Interactive Sheets
    var selectedChallengeForLeaderboard by remember { mutableStateOf<WellnessChallengeDto?>(null) }
    var celebrationData by remember { mutableStateOf<CelebrationPayload?>(null) }

    LaunchedEffect(Unit) {
        viewModel.refreshCommunity()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Challenges & Ranks",
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
                        Toast.makeText(context, "Challenges & ranks updated", Toast.LENGTH_SHORT).show()
                    }) {
                        Icon(Icons.Default.Refresh, "Refresh", tint = TealPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = TealSurface
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Gamification Level & XP Top Bar
            GamificationStatusBar(
                streakDays = state.streakDays.coerceAtLeast(7),
                currentXp = 350,
                targetXp = 500,
                level = 3,
                medcoins = 150
            )

            // Segmented Tabs
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = TealDeep,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = Color(0xFFF59E0B),
                        height = 3.dp
                    )
                },
                divider = { HorizontalDivider(color = Color(0xFFE2E8F0)) }
            ) {
                tabs.forEachIndexed { index, title ->
                    val isSelected = selectedTab == index
                    Tab(
                        selected = isSelected,
                        onClick = { selectedTab = index },
                        text = {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center,
                                modifier = Modifier.padding(horizontal = 2.dp, vertical = 8.dp)
                            ) {
                                Text(
                                    if (index == 0) "🔥 " else "🎖️ ",
                                    fontSize = 13.sp
                                )
                                Text(
                                    title,
                                    fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.SemiBold,
                                    fontSize = 12.5.sp,
                                    color = if (isSelected) TealDeep else Color(0xFF64748B),
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        }
                    )
                }
            }

            // Tab Content
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                when (selectedTab) {
                    0 -> ChallengesTab(
                        challenges = state.challenges,
                        onChallengeClick = { selectedChallengeForLeaderboard = it },
                        onJoinChallenge = { challenge ->
                            viewModel.joinWellnessChallenge(challenge.id) { success, msg ->
                                Toast.makeText(context, msg ?: if (success) "Sprint Joined!" else "Failed to join", Toast.LENGTH_SHORT).show()
                                if (success) {
                                    celebrationData = CelebrationPayload(
                                        title = "Sprint Contest Joined! 🏃",
                                        subtitle = "You are now live in ${challenge.title}. Walk, log workouts, and aim for the podium!",
                                        iconEmoji = "🏆",
                                        xpEarned = 100,
                                        medcoinsEarned = 50
                                    )
                                }
                            }
                        },
                        onOpenLeaderboard = { selectedChallengeForLeaderboard = it }
                    )
                    else -> TrophyRoomTab(
                        badges = state.badges,
                        onBadgeClick = { badge ->
                            val isEarned = badge.get("is_earned")?.asBoolean == true
                            val name = badge.get("name")?.asString ?: "Badge"
                            val desc = badge.get("description")?.asString ?: ""
                            celebrationData = CelebrationPayload(
                                title = if (isEarned) "Trophy Milestone! 🏆" else "Milestone Target 🎯",
                                subtitle = "$name\n$desc",
                                iconEmoji = if (isEarned) "🏅" else "🔒",
                                xpEarned = badge.get("reward_xp")?.asInt ?: 150,
                                medcoinsEarned = 50
                            )
                        }
                    )
                }
            }
        }
    }

    // Leaderboard BottomSheet
    selectedChallengeForLeaderboard?.let { challenge ->
        ChallengeLeaderboardBottomSheet(
            challenge = challenge,
            viewModel = viewModel,
            onDismiss = { selectedChallengeForLeaderboard = null }
        )
    }

    // Celebration Confetti Dialog
    celebrationData?.let { data ->
        MilestoneCelebrationDialog(
            payload = data,
            onDismiss = { celebrationData = null }
        )
    }
}

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
                    Text("⭐ Level $level Athlete", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFFFDE68A))
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
// TAB 1: CHALLENGES LIST
// ==========================================

@Composable
private fun ChallengesTab(
    challenges: List<WellnessChallengeDto>,
    onChallengeClick: (WellnessChallengeDto) -> Unit,
    onJoinChallenge: (WellnessChallengeDto) -> Unit,
    onOpenLeaderboard: (WellnessChallengeDto) -> Unit
) {
    val masterChallenges = remember(challenges) {
        if (challenges.isNotEmpty()) challenges
        else listOf(
            WellnessChallengeDto(
                id = "chal-1",
                title = "7-Day 70K Steps Monsoon Blitz",
                description = "Hit 10,000 steps daily. Elevate cardiovascular health & burn calories!",
                challengeType = "steps",
                targetValue = 70000.0,
                targetUnit = "Steps",
                rewardXp = 250,
                rewardMedCoins = 100,
                endsAt = "7 Days Left",
                progressPercent = 60,
                progressValue = 42000.0,
                isJoined = true
            ),
            WellnessChallengeDto(
                id = "chal-2",
                title = "21-Day Cellular Hydration Detox",
                description = "Drink 3,000 ml water every day. Optimize kidney filtration & energy.",
                challengeType = "hydration",
                targetValue = 21000.0,
                targetUnit = "ml Water",
                rewardXp = 200,
                rewardMedCoins = 80,
                endsAt = "14 Days Left",
                progressPercent = 35,
                progressValue = 7350.0,
                isJoined = false
            ),
            WellnessChallengeDto(
                id = "chal-3",
                title = "14-Day Morning Suryanamaskar Streak",
                description = "Complete 12 rounds of Sun Salutation daily before 9 AM.",
                challengeType = "yoga",
                targetValue = 14.0,
                targetUnit = "Days",
                rewardXp = 300,
                rewardMedCoins = 120,
                endsAt = "11 Days Left",
                progressPercent = 50,
                progressValue = 7.0,
                isJoined = true
            )
        )
    }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // Featured Hero Sprint
        val featured = masterChallenges.firstOrNull()
        if (featured != null) {
            item {
                FeaturedSprintHeroCard(
                    challenge = featured,
                    onJoinChallenge = { onJoinChallenge(featured) },
                    onOpenLeaderboard = { onOpenLeaderboard(featured) }
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

        items(masterChallenges, key = { it.id }) { challenge ->
            ChallengeListItemCard(
                challenge = challenge,
                onClick = { onChallengeClick(challenge) },
                onJoinClick = { onJoinChallenge(challenge) },
                onLeaderboardClick = { onOpenLeaderboard(challenge) }
            )
        }
    }
}

@Composable
private fun FeaturedSprintHeroCard(
    challenge: WellnessChallengeDto,
    onJoinChallenge: () -> Unit,
    onOpenLeaderboard: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .background(ChallengeHeroGradient)
                .padding(18.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFFDE68A)
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
                        Text("⏳ ${challenge.endsAt ?: "7 Days Left"}", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
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

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
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
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🏅 Live Podium", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 1, softWrap = false)
                    }

                    val isJoined = challenge.isJoined == true
                    Button(
                        onClick = onJoinChallenge,
                        colors = ButtonDefaults.buttonColors(containerColor = if (isJoined) Color(0xFF5EEAD4) else Color(0xFFF59E0B)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1.2f)
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
private fun ChallengeListItemCard(
    challenge: WellnessChallengeDto,
    onClick: () -> Unit,
    onJoinClick: () -> Unit,
    onLeaderboardClick: () -> Unit
) {
    val isJoined = challenge.isJoined == true
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp),
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
                    shape = RoundedCornerShape(8.dp),
                    color = when (challenge.challengeType?.lowercase()) {
                        "steps" -> Color(0xFFFEF3C7)
                        "yoga" -> Color(0xFFEDE9FE)
                        "cardio" -> Color(0xFFFFEDD5)
                        else -> TealMint
                    }
                ) {
                    Text(
                        (challenge.challengeType ?: "Sprint").uppercase(),
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
                    "⏳ ${challenge.endsAt ?: "7 Days Left"}",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF64748B)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                challenge.title,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                color = TealDeep
            )

            challenge.description?.let {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    it,
                    fontSize = 12.sp,
                    color = Color(0xFF64748B),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Reward Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                    .padding(10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Target", fontSize = 10.sp, color = Color(0xFF94A3B8))
                    Text(
                        "${challenge.targetValue?.toInt() ?: 100} ${challenge.targetUnit ?: "Units"}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TealDeep
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text("Rewards", fontSize = 10.sp, color = Color(0xFF94A3B8))
                    Text(
                        "🪙 +${challenge.rewardMedCoins ?: 80} Coins • +${challenge.rewardXp ?: 200} XP",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFFD97706)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = Color(0xFFF1F5F9))
            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFFEF3C7),
                    modifier = Modifier.clickable { onLeaderboardClick() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("🏅", fontSize = 12.sp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Podium", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = Color(0xFF92400E))
                    }
                }

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = if (isJoined) TealMint else TealPrimary,
                    modifier = Modifier.clickable {
                        if (isJoined) onClick() else onJoinClick()
                    }
                ) {
                    Text(
                        text = if (isJoined) "Enrolled ✓" else "+ Join Sprint",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (isJoined) TealDark else Color.White,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
                    )
                }
            }
        }
    }
}

// ==========================================
// TAB 2: TROPHY ROOM & BADGES
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
        item {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFF4C1D95),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Trophy Showcase", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.White)
                            Text("$earnedCount of ${masterBadges.size} Milestones Unlocked", fontSize = 12.sp, color = Color(0xFFDDD6FE))
                        }
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFFFDE68A),
                            modifier = Modifier.size(46.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("🏆", fontSize = 24.sp)
                            }
                        }
                    }
                }
            }
        }

        item {
            Text("Unlocked & In-Progress Badges", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = TealDeep)
        }

        items(masterBadges.chunked(2)) { pair ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                pair.forEach { badge ->
                    Box(modifier = Modifier.weight(1f)) {
                        TrophyBadgeGridCard(badge = badge, onClick = { onBadgeClick(badge) })
                    }
                }
                if (pair.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun TrophyBadgeGridCard(
    badge: JsonObject,
    onClick: () -> Unit
) {
    val isEarned = badge.get("is_earned")?.asBoolean == true
    val name = badge.get("name")?.asString ?: "Milestone"
    val icon = badge.get("icon_url")?.asString ?: "🏅"
    val xp = badge.get("reward_xp")?.asInt ?: 100

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isEarned) Color.White else Color(0xFFF8FAFC)
        ),
        elevation = CardDefaults.cardElevation(if (isEarned) 2.dp else 0.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isEarned) Color(0xFFFDE68A) else Color(0xFFE2E8F0)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                shape = CircleShape,
                color = if (isEarned) Color(0xFFFEF3C7) else Color(0xFFE2E8F0),
                modifier = Modifier.size(52.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(icon, fontSize = 26.sp)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                name,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 12.5.sp,
                color = if (isEarned) TealDeep else Color(0xFF94A3B8),
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                if (isEarned) "UNLOCKED ✨ (+$xp XP)" else "LOCKED 🔒 (+$xp XP)",
                fontSize = 10.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (isEarned) Color(0xFFD97706) else Color(0xFF94A3B8)
            )
        }
    }
}

// ==========================================
// BOTTOMSHEET: PODIUM LEADERBOARD
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
                color = Color(0xFF64748B)
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
                    PodiumColumn(
                        rank = 2,
                        name = top2?.displayName ?: "Sneha R.",
                        score = "${top2?.score?.toInt() ?: 58200} Steps",
                        medalEmoji = "🥈",
                        crownColor = Color(0xFF94A3B8),
                        height = 90.dp
                    )

                    PodiumColumn(
                        rank = 1,
                        name = top1?.displayName ?: "Amit S.",
                        score = "${top1?.score?.toInt() ?: 64500} Steps",
                        medalEmoji = "🥇",
                        crownColor = Color(0xFFF59E0B),
                        height = 115.dp
                    )

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
            }

            Spacer(modifier = Modifier.height(20.dp))
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
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Bottom
    ) {
        Text(medalEmoji, fontSize = 22.sp)
        Spacer(modifier = Modifier.height(2.dp))
        Text(name, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = TealDeep, maxLines = 1)
        Text(score, fontSize = 9.5.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium)
        Spacer(modifier = Modifier.height(6.dp))

        Box(
            modifier = Modifier
                .width(85.dp)
                .height(height)
                .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(crownColor, crownColor.copy(alpha = 0.7f))
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                "#$rank",
                fontWeight = FontWeight.Black,
                fontSize = 18.sp,
                color = Color.White
            )
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
        color = if (isSelf) TealMint.copy(alpha = 0.5f) else Color(0xFFF8FAFC),
        border = if (isSelf) androidx.compose.foundation.BorderStroke(1.dp, TealPrimary) else null,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "#$rank",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 12.sp,
                    color = if (isSelf) TealDark else Color(0xFF94A3B8),
                    modifier = Modifier.width(28.dp)
                )
                Text(
                    name + if (isSelf) " (You)" else "",
                    fontWeight = if (isSelf) FontWeight.ExtraBold else FontWeight.Bold,
                    fontSize = 12.5.sp,
                    color = if (isSelf) TealDark else TealDeep
                )
            }
            Text(
                score,
                fontSize = 12.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (isSelf) TealDark else TealPrimary
            )
        }
    }
}

@Composable
private fun MilestoneCelebrationDialog(
    payload: CelebrationPayload,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(payload.iconEmoji, fontSize = 48.sp)
                Spacer(modifier = Modifier.height(12.dp))
                Text(payload.title, fontWeight = FontWeight.Black, fontSize = 18.sp, color = TealDeep, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(6.dp))
                Text(payload.subtitle, fontSize = 12.5.sp, color = Color(0xFF64748B), textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFFEF3C7)) {
                        Text("🪙 +${payload.medcoinsEarned} MedCoins", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = Color(0xFF92400E), modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                    }
                    Surface(shape = RoundedCornerShape(10.dp), color = TealMint) {
                        Text("⭐ +${payload.xpEarned} XP", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = TealDark, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
                Button(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Awesome! Let's Go 🚀", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
