package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.data.remote.dto.WellnessCoachDetailDto
import com.example.swastik.ui.viewmodel.WellnessCoachDetailViewModel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessCoachDetailScreen(
    coachId: String,
    onBackClick: () -> Unit,
    onBookSession: (String) -> Unit,
    viewModel: WellnessCoachDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(coachId) {
        viewModel.loadCoachDetail(coachId)
    }

    val coachDetail = uiState.coach
    val isLoading = uiState.isLoading
    val error = uiState.error

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        coachDetail?.name ?: "Expert Profile",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = WellnessTheme.TealDeep
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = WellnessTheme.TealDeep)
                    }
                },
                actions = {
                    IconButton(onClick = { /* Share profile */ }) {
                        Icon(Icons.Default.Share, contentDescription = "Share", tint = WellnessTheme.TealDeep)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = WellnessTheme.TealSurface
                )
            )
        },
        bottomBar = {
            coachDetail?.let { coach ->
                Surface(
                    shadowElevation = 12.dp,
                    color = Color.White,
                    border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorderLight)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Session Fee", fontSize = 11.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium)
                            Text(
                                if ((coach.sessionFee ?: 0.0) > 0) "₹${coach.sessionFee?.toInt()}" else "Free",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = WellnessTheme.TealDeep
                            )
                        }
                        Button(
                            onClick = { onBookSession(coachId) },
                            modifier = Modifier
                                .weight(2f)
                                .height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = WellnessTheme.TealDark),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Filled.CalendarMonth, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Book Session", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }
                    }
                }
            }
        },
        containerColor = WellnessTheme.TealSurface
    ) { paddingValues ->
        when {
            isLoading -> {
                Box(Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = WellnessTheme.TealDark)
                }
            }
            error != null -> {
                Box(Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color.Red, modifier = Modifier.size(48.dp))
                        Text(error ?: "Something went wrong", color = Color.Gray)
                    }
                }
            }
            coachDetail != null -> {
                CoachDetailContent(
                    coach = coachDetail,
                    onBookSession = { onBookSession(coachId) },
                    modifier = Modifier.padding(paddingValues)
                )
            }
        }
    }
}

@Composable
private fun CoachDetailContent(
    coach: WellnessCoachDetailDto,
    onBookSession: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero Card
        HeroProfileSection(coach)

        // Quick Stats Row
        QuickStatsStrip(coach)

        // Live Schedule Strip Preview
        SchedulePreviewSection(coach, onBookSession)

        // About / Bio Card
        if (!coach.bio.isNullOrBlank()) {
            DetailSectionCard("About the Expert") {
                Text(
                    coach.bio ?: "",
                    fontSize = 13.sp,
                    color = Color(0xFF334155),
                    lineHeight = 22.sp
                )
            }
        }

        // Specialties & Conditions Managed
        val allTags = (coach.specialties.orEmpty() + coach.expertiseTags.orEmpty()).distinct()
        if (allTags.isNotEmpty()) {
            DetailSectionCard("Specializations & Focus Areas") {
                FlowRowChips(allTags, WellnessTheme.TealSurfaceVariant, WellnessTheme.TealDark)
            }
        }

        // Qualifications & Certifications
        val certs = (coach.qualifications.orEmpty() + coach.certifications.orEmpty()).distinct()
        if (certs.isNotEmpty()) {
            DetailSectionCard("Qualifications & Certifications") {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    certs.forEach { cert ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.Verified, contentDescription = null, tint = WellnessTheme.TealPrimary, modifier = Modifier.size(16.dp))
                            Text(cert, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color(0xFF1E293B))
                        }
                    }
                }
            }
        }

        // Client Transformations / Case Studies
        ClientTransformationsCard()

        // Rating & Reviews Matrix
        RatingBreakdownCard(coach)

        Spacer(Modifier.height(16.dp))
    }
}

// ==================== HERO PROFILE SECTION ====================

@Composable
private fun HeroProfileSection(coach: WellnessCoachDetailDto) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorderLight),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .shadow(3.dp, RoundedCornerShape(24.dp), spotColor = WellnessTheme.TealBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Profile Photo with Glowing Teal Ring
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(CircleShape)
                    .border(3.dp, WellnessTheme.TealMint, CircleShape)
            ) {
                if (!coach.profileImageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(coach.profileImageUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = coach.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier.fillMaxSize().background(WellnessTheme.TealSurfaceVariant),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Person, null, tint = WellnessTheme.TealDark, modifier = Modifier.size(48.dp))
                    }
                }
            }

            // Name + Verified Badge
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(coach.name, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp, color = WellnessTheme.TealDeep)
                Icon(Icons.Default.Verified, contentDescription = "Verified", tint = WellnessTheme.TealPrimary, modifier = Modifier.size(18.dp))
            }

            // Headline
            coach.headline?.let {
                Text(
                    it,
                    fontSize = 13.sp,
                    color = Color(0xFF475569),
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )
            }

            // Live Status + City
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                LiveAvailabilityPill(isAvailableToday = true)
                coach.city?.let {
                    Text("📍 $it", fontSize = 11.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium)
                }
            }
        }
    }
}

// ==================== QUICK STATS STRIP ====================

@Composable
private fun QuickStatsStrip(coach: WellnessCoachDetailDto) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorderLight),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .shadow(2.dp, RoundedCornerShape(18.dp), spotColor = WellnessTheme.TealBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 14.dp, horizontal = 12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Rating
            StatColumn(
                icon = Icons.Default.Star,
                iconTint = WellnessTheme.StarYellow,
                title = String.format("%.1f ★", coach.rating ?: 4.9),
                subtitle = "${coach.totalReviews ?: 0} Reviews"
            )
            VerticalDivider(modifier = Modifier.height(28.dp), color = Color(0xFFE2E8F0))
            // Experience
            StatColumn(
                icon = Icons.Default.WorkspacePremium,
                iconTint = WellnessTheme.TealPrimary,
                title = "${coach.experienceYears ?: 5}+ Yrs",
                subtitle = "Experience"
            )
            VerticalDivider(modifier = Modifier.height(28.dp), color = Color(0xFFE2E8F0))
            // Clients
            StatColumn(
                icon = Icons.Default.Groups,
                iconTint = WellnessTheme.TealDark,
                title = "${coach.totalClients ?: 120}+",
                subtitle = "Active Clients"
            )
        }
    }
}

@Composable
private fun StatColumn(icon: ImageVector, iconTint: Color, title: String, subtitle: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(16.dp))
            Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = WellnessTheme.TealDeep)
        }
        Text(subtitle, fontSize = 10.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium)
    }
}

// ==================== SCHEDULE PREVIEW SECTION ====================

@Composable
private fun SchedulePreviewSection(coach: WellnessCoachDetailDto, onBookSession: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorderLight),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .shadow(2.dp, RoundedCornerShape(20.dp), spotColor = WellnessTheme.TealBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = WellnessTheme.TealPrimary, modifier = Modifier.size(18.dp))
                    Text("Available Slots This Week", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = WellnessTheme.TealDeep)
                }
                TextButton(onClick = onBookSession) {
                    Text("See All", color = WellnessTheme.TealPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            // 7 Days Strip
            val next7Days = remember {
                (0..6).map { LocalDate.now().plusDays(it.toLong()) }
            }
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(next7Days) { date ->
                    val isToday = date == LocalDate.now()
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isToday) WellnessTheme.TealSurfaceVariant else Color(0xFFF8FAFC),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isToday) WellnessTheme.TealDark else Color(0xFFE2E8F0)
                        ),
                        modifier = Modifier.clickable { onBookSession() }
                    ) {
                        Column(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(date.format(DateTimeFormatter.ofPattern("EEE")), fontSize = 11.sp, color = Color(0xFF64748B))
                            Text(date.format(DateTimeFormatter.ofPattern("d")), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = WellnessTheme.TealDeep)
                            Text("3 slots", fontSize = 9.sp, color = WellnessTheme.TealPrimary, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

// ==================== TRANSFORMATIONS CARD ====================

@Composable
private fun ClientTransformationsCard() {
    DetailSectionCard("Client Success Stories") {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            val stories = listOf(
                "Lost 7 kg in 10 weeks with customized PCOS diet plan",
                "Reversed chronic lower back pain through posture rehab",
                "Built 4 kg lean muscle with strength conditioning"
            )
            stories.forEach { story ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(WellnessTheme.TealSurface, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(shape = CircleShape, color = WellnessTheme.TealSurfaceVariant, modifier = Modifier.size(28.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Check, null, tint = WellnessTheme.TealDark, modifier = Modifier.size(14.dp))
                        }
                    }
                    Text(story, fontSize = 12.sp, color = Color(0xFF1E293B), fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

// ==================== RATING BREAKDOWN MATRIX ====================

@Composable
private fun RatingBreakdownCard(coach: WellnessCoachDetailDto) {
    DetailSectionCard("Patient Feedback & Reviews") {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(String.format("%.1f", coach.rating ?: 4.9), fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = WellnessTheme.TealDeep)
                    Row {
                        repeat(5) {
                            Icon(Icons.Default.Star, null, tint = WellnessTheme.StarYellow, modifier = Modifier.size(12.dp))
                        }
                    }
                    Text("${coach.totalReviews ?: 0} ratings", fontSize = 10.sp, color = Color(0xFF64748B))
                }

                // 5-Star Bars
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    listOf(5 to 0.85f, 4 to 0.12f, 3 to 0.03f, 2 to 0.0f, 1 to 0.0f).forEach { (star, progress) ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("$star★", fontSize = 10.sp, color = Color(0xFF64748B))
                            LinearProgressIndicator(
                                progress = { progress },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color = WellnessTheme.TealPrimary,
                                trackColor = Color(0xFFE2E8F0)
                            )
                        }
                    }
                }
            }

            // Feedback Tag Pills
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Very Patient", "Customized Indian Diet", "Great Motivator", "Strict Routine").forEach { pill ->
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFF1F5F9)
                    ) {
                        Text(pill, fontSize = 10.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                    }
                }
            }
        }
    }
}

// ==================== HELPER COMPONENTS ====================

@Composable
private fun DetailSectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorderLight),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .shadow(2.dp, RoundedCornerShape(20.dp), spotColor = WellnessTheme.TealBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = WellnessTheme.TealDeep)
            content()
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FlowRowChips(items: List<String>, containerColor: Color, contentColor: Color) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        items.forEach { item ->
            val cleanItem = item.replace("_", " ").split(" ").joinToString(" ") { word -> word.replaceFirstChar { it.uppercase() } }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = containerColor
            ) {
                Text(
                    cleanItem,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = contentColor,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}
