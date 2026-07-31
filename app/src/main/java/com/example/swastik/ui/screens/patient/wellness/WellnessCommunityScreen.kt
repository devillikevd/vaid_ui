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
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.remote.dto.WellnessChallengeDto
import com.example.swastik.data.remote.dto.WellnessGroupDto
import com.example.swastik.ui.viewmodel.WellnessViewModel
import com.google.gson.JsonObject

private val CommunityGreen = Color(0xFF047857)
private val ChallengeOrange = Color(0xFFE65100)
private val BadgePurple = Color(0xFF7C3AED)
private val LeaderboardBlue = Color(0xFF2563EB)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessCommunityScreen(
    onNavigateBack: () -> Unit,
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Groups", "Challenges", "Badges")

    LaunchedEffect(Unit) { viewModel.refreshCommunity() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Community & Challenges", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refreshCommunity) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFFE8F8EF))
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color(0xFFE8F8EF),
                contentColor = CommunityGreen,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = when (selectedTab) { 0 -> CommunityGreen; 1 -> ChallengeOrange; else -> BadgePurple }
                    )
                }
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title, fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal) }
                    )
                }
            }

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = CommunityGreen)
                }
            } else {
                when (selectedTab) {
                    0 -> GroupsTab(groups = state.groups)
                    1 -> ChallengesTab(challenges = state.challenges)
                    2 -> BadgesTab(badges = state.badges)
                }
            }
        }
    }
}

@Composable
private fun GroupsTab(groups: List<WellnessGroupDto>) {
    if (groups.isEmpty()) {
        CommunityEmptyState(
            icon = Icons.Default.Groups,
            title = "No Communities Yet",
            message = "Join wellness communities to connect with like-minded fitness enthusiasts.",
            color = CommunityGreen
        )
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(groups) { group ->
                GroupCard(group)
            }
        }
    }
}

@Composable
private fun GroupCard(group: WellnessGroupDto) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = CommunityGreen.copy(alpha = 0.1f),
                modifier = Modifier.size(56.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Groups, null, tint = CommunityGreen, modifier = Modifier.size(28.dp))
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(group.name, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                group.description?.let {
                    Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    group.goalTag?.let {
                        Surface(shape = RoundedCornerShape(16.dp), color = CommunityGreen.copy(alpha = 0.12f)) {
                            Text(
                                it.replaceFirstChar { c -> c.uppercase() },
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                fontSize = 10.sp, fontWeight = FontWeight.Bold, color = CommunityGreen
                            )
                        }
                    }
                    group.memberCount?.let { count ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.People, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(3.dp))
                            Text("$count members", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    group.city?.let { city ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Place, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(city, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChallengesTab(challenges: List<WellnessChallengeDto>) {
    if (challenges.isEmpty()) {
        CommunityEmptyState(
            icon = Icons.Default.EmojiEvents,
            title = "No Challenges Yet",
            message = "Wellness challenges will appear here when available. Stay tuned!",
            color = ChallengeOrange
        )
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(challenges) { challenge ->
                ChallengeCard(challenge)
            }
        }
    }
}

@Composable
private fun ChallengeCard(challenge: WellnessChallengeDto) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = ChallengeOrange.copy(alpha = 0.1f)
                    ) {
                        Icon(Icons.Default.DirectionsRun, null, tint = ChallengeOrange, modifier = Modifier.padding(8.dp).size(24.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(challenge.title, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                        challenge.challengeType?.let {
                            Text(it.replace("_", " ").replaceFirstChar { c -> c.uppercase() }, fontSize = 11.sp, color = ChallengeOrange, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }

            challenge.description?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Text(it, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3, overflow = TextOverflow.Ellipsis)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Progress / Target
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                challenge.targetValue?.let { target ->
                    Column {
                        Text("Target", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${target.toInt()} ${challenge.targetUnit ?: ""}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ChallengeOrange)
                    }
                }
                challenge.participantCount?.let { count ->
                    Column {
                        Text("Participants", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("$count", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
                challenge.endsAt?.let { endsAt ->
                    Column {
                        Text("Ends", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(endsAt.take(10), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFFE53935))
                    }
                }
            }
        }
    }
}

@Composable
private fun BadgesTab(badges: List<JsonObject>) {
    if (badges.isEmpty()) {
        CommunityEmptyState(
            icon = Icons.Default.WorkspacePremium,
            title = "No Badges Yet",
            message = "Complete challenges and milestones to earn badges and climb the leaderboard!",
            color = BadgePurple
        )
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(badges) { badge ->
                BadgeCard(badge)
            }
        }
    }
}

@Composable
private fun BadgeCard(badge: JsonObject) {
    val name = badge.get("name")?.asString ?: badge.get("title")?.asString ?: "Badge"
    val description = badge.get("description")?.asString ?: ""
    val earnedAt = badge.get("earned_at")?.asString ?: badge.get("createdAt")?.asString
    val category = badge.get("category")?.asString ?: badge.get("type")?.asString

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = BadgePurple.copy(alpha = 0.1f),
                modifier = Modifier.size(56.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.WorkspacePremium, null, tint = BadgePurple, modifier = Modifier.size(28.dp))
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(name, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                if (description.isNotBlank()) {
                    Text(description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                    category?.let {
                        Surface(shape = RoundedCornerShape(12.dp), color = BadgePurple.copy(alpha = 0.12f)) {
                            Text(it, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BadgePurple)
                        }
                    }
                    earnedAt?.let {
                        Text("Earned: ${it.take(10)}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
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
            Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text(message, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        }
    }
}
