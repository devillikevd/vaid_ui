package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.WellnessCoachDetailDto
import com.example.swastik.ui.viewmodel.WellnessCoachDetailViewModel
import java.util.Locale

private val WellnessGreen = Color(0xFF2E7D32)
private val WellnessGreenLight = Color(0xFFE8F5E9)
private val WellnessGreenDark = Color(0xFF1B5E20)
private val CardBg = Color(0xFFF8FFF8)
private val StarYellow = Color(0xFFFFC107)
private val VideoBlue = Color(0xFF1565C0)
private val ChatPurple = Color(0xFF7B1FA2)
private val InPersonOrange = Color(0xFFE65100)

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
                title = { Text("Coach Profile", fontWeight = FontWeight.SemiBold) },
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
        },
        bottomBar = {
            coachDetail?.let { coach ->
                Surface(shadowElevation = 8.dp, color = Color.White) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Session Fee", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                            Text(
                                if ((coach.sessionFee ?: 0.0) > 0) "₹${coach.sessionFee?.toInt()}" else "Free",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold, color = WellnessGreen
                            )
                        }
                        Button(
                            onClick = { onBookSession(coachId) },
                            modifier = Modifier.weight(2f).height(52.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Filled.CalendarMonth, contentDescription = null, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Book Session", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        when {
            isLoading -> {
                Box(Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = WellnessGreen)
                }
            }
            error != null -> {
                Box(Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color.Red, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(8.dp))
                        Text(error ?: "Something went wrong", color = Color.Gray)
                    }
                }
            }
            coachDetail != null -> {
                CoachDetailContent(coach = coachDetail!!, modifier = Modifier.padding(paddingValues))
            }
        }
    }
}

@Composable
private fun CoachDetailContent(coach: WellnessCoachDetailDto, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        CoachHeroSection(coach)
        CoachQuickStats(coach)

        if (!coach.bio.isNullOrBlank()) {
            SectionCard("About") {
                Text(coach.bio, style = MaterialTheme.typography.bodyMedium, color = Color(0xFF424242), lineHeight = 22.sp)
            }
        }

        val tags = (coach.specialties.orEmpty() + coach.expertiseTags.orEmpty()).distinct()
        if (tags.isNotEmpty()) {
            SectionCard("Specialties & Expertise") { FlowRowChips(tags, WellnessGreenLight, WellnessGreen) }
        }

        val qualCert = (coach.qualifications.orEmpty() + coach.certifications.orEmpty()).distinct()
        if (qualCert.isNotEmpty()) {
            SectionCard("Qualifications") {
                qualCert.forEach { item ->
                    Row(modifier = Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Verified, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(item, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        SectionCard("Session Options") { SessionModeCards(coach) }

        val days = coach.availableDays.orEmpty()
        if (days.isNotEmpty()) {
            SectionCard("Availability") { AvailabilityDayChips(days) }
        }

        val gallery = coach.galleryImages.orEmpty()
        if (gallery.isNotEmpty()) {
            SectionCard("Gallery") {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(gallery) { imageUrl ->
                        AsyncImage(
                            model = imageUrl, contentDescription = "Gallery",
                            modifier = Modifier.size(120.dp).clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Crop
                        )
                    }
                }
            }
        }

        val langs = coach.languages.orEmpty()
        if (langs.isNotEmpty()) {
            SectionCard("Languages") { FlowRowChips(langs, Color(0xFFE3F2FD), Color(0xFF1565C0)) }
        }

        if (!coach.city.isNullOrBlank()) {
            SectionCard("Location") {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.LocationOn, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(listOfNotNull(coach.address, coach.city, coach.state).joinToString(", "), style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        Spacer(Modifier.height(100.dp))
    }
}

@Composable
private fun CoachHeroSection(coach: WellnessCoachDetailDto) {
    Box(
        modifier = Modifier.fillMaxWidth()
            .background(Brush.verticalGradient(listOf(WellnessGreen, WellnessGreenDark)))
            .padding(24.dp)
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier.size(100.dp).clip(CircleShape)
                    .background(WellnessGreenLight).border(3.dp, Color.White.copy(alpha = 0.5f), CircleShape)
            ) {
                if (!coach.profileImageUrl.isNullOrBlank()) {
                    AsyncImage(model = coach.profileImageUrl, contentDescription = coach.name,
                        modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                } else {
                    Icon(Icons.Filled.Person, contentDescription = null,
                        modifier = Modifier.align(Alignment.Center).size(48.dp), tint = WellnessGreen)
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(coach.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White)
                if (!coach.headline.isNullOrBlank()) {
                    Text(coach.headline, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.85f), maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    coach.coachTypes?.take(3)?.forEach { type ->
                        Surface(shape = RoundedCornerShape(6.dp), color = Color.White.copy(alpha = 0.2f)) {
                            Text(type.replaceFirstChar { it.titlecase(Locale.getDefault()) },
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.Medium)
                        }
                    }
                }
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Star, contentDescription = null, tint = StarYellow, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("${coach.rating ?: 0.0}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text(" (${coach.totalReviews ?: 0} reviews)", color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun CoachQuickStats(coach: WellnessCoachDetailDto) {
    Row(
        modifier = Modifier.fillMaxWidth().background(CardBg).padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        QuickStatItem("${coach.experienceYears ?: 0}+", "Years Exp.", Icons.Filled.WorkHistory)
        QuickStatItem("${coach.totalClients ?: 0}", "Clients", Icons.Filled.Groups)
        QuickStatItem("${coach.totalSessions ?: 0}", "Sessions", Icons.Filled.EventAvailable)
        QuickStatItem(coach.languages?.size?.toString() ?: "1", "Languages", Icons.Filled.Translate)
    }
}

@Composable
private fun QuickStatItem(value: String, label: String, icon: ImageVector) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(22.dp))
        Spacer(Modifier.height(4.dp))
        Text(value, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = WellnessGreenDark)
        Text(label, fontSize = 11.sp, color = Color.Gray)
    }
}

@Composable
private fun SessionModeCards(coach: WellnessCoachDetailDto) {
    val modes = coach.sessionModes.orEmpty().ifEmpty { listOf("video") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        modes.forEach { mode ->
            val icon: ImageVector
            val label: String
            val color: Color
            val fee: Double
            when (mode) {
                "video" -> { icon = Icons.Filled.Videocam; label = "Video Session"; color = VideoBlue; fee = coach.videoSessionFee ?: coach.sessionFee ?: 0.0 }
                "chat" -> { icon = Icons.AutoMirrored.Filled.Chat; label = "Chat Session"; color = ChatPurple; fee = coach.sessionFee ?: 0.0 }
                "in_person" -> { icon = Icons.Filled.PersonPin; label = "In-Person"; color = InPersonOrange; fee = coach.sessionFee ?: 0.0 }
                "audio" -> { icon = Icons.Filled.Phone; label = "Audio Call"; color = Color(0xFF00695C); fee = coach.sessionFee ?: 0.0 }
                else -> { icon = Icons.Filled.Videocam; label = mode.replaceFirstChar { it.titlecase(Locale.getDefault()) }; color = WellnessGreen; fee = coach.sessionFee ?: 0.0 }
            }
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(1.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(color.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(22.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Text(if (mode == "in_person") "At gym or studio" else "45 min session", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                    Text(if (fee > 0) "₹${fee.toInt()}" else "Free", fontWeight = FontWeight.Bold, color = color, fontSize = 16.sp)
                }
            }
        }

        val monthlyFee = coach.monthlyPlanFee ?: 0.0
        if (monthlyFee > 0) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = WellnessGreenLight),
                elevation = CardDefaults.cardElevation(0.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(WellnessGreen.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.CardMembership, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(22.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Monthly Plan", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Text("Unlimited sessions per month", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                    Text("₹${monthlyFee.toInt()}/mo", fontWeight = FontWeight.Bold, color = WellnessGreen, fontSize = 16.sp)
                }
            }
        }
    }
}

@Composable
private fun AvailabilityDayChips(days: List<String>) {
    val allDays = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
    val abbrevs = listOf("Mo", "Tu", "We", "Th", "Fr", "Sa", "Su")
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        allDays.forEachIndexed { index, day ->
            val isAvailable = days.any { it.equals(day, ignoreCase = true) || it.startsWith(abbrevs[index], ignoreCase = true) }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = if (isAvailable) WellnessGreen else Color(0xFFEEEEEE),
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    abbrevs[index], modifier = Modifier.padding(vertical = 8.dp),
                    textAlign = TextAlign.Center,
                    color = if (isAvailable) Color.White else Color.Gray,
                    fontWeight = if (isAvailable) FontWeight.Bold else FontWeight.Normal, fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
private fun FlowRowChips(items: List<String>, bgColor: Color, textColor: Color) {
    Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        items.forEach { item ->
            Surface(shape = RoundedCornerShape(8.dp), color = bgColor) {
                Text(
                    item.replaceFirstChar { it.titlecase(Locale.getDefault()) },
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    color = textColor, fontSize = 13.sp, fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = WellnessGreenDark)
            Spacer(Modifier.height(10.dp))
            content()
        }
    }
}
