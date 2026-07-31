package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.data.remote.dto.WellnessCoachDto
import com.example.swastik.ui.viewmodel.WellnessViewModel

private val ExpertPurple = Color(0xFF6A5AE0)
private val ExpertPurpleLight = Color(0xFFF0EDFF)
private val TrainerGreen = Color(0xFF047857)
private val YogaOrange = Color(0xFFE65100)
private val NutritionBlue = Color(0xFF2563EB)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessExpertsScreen(
    onNavigateBack: () -> Unit,
    onCoachClick: (coachId: String) -> Unit = {},
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) { viewModel.refreshExperts() }

    // Build categories from actual data
    val allCoaches = state.coaches
    val personalTrainers = remember(allCoaches) { viewModel.getPersonalTrainers() }
    val yogaInstructors = remember(allCoaches) { viewModel.getYogaInstructors() }
    val nutritionists = remember(allCoaches) { viewModel.getNutritionists() }
    val otherCoaches = remember(allCoaches) { viewModel.getOtherCoaches() }

    data class CoachCategory(val name: String, val coaches: List<WellnessCoachDto>, val color: Color, val icon: androidx.compose.ui.graphics.vector.ImageVector)

    val categories = remember(allCoaches) {
        buildList {
            add(CoachCategory("All", allCoaches, ExpertPurple, Icons.Default.Groups))
            if (personalTrainers.isNotEmpty()) add(CoachCategory("Trainers", personalTrainers, TrainerGreen, Icons.Default.FitnessCenter))
            if (yogaInstructors.isNotEmpty()) add(CoachCategory("Yoga", yogaInstructors, YogaOrange, Icons.Default.SelfImprovement))
            if (nutritionists.isNotEmpty()) add(CoachCategory("Nutrition", nutritionists, NutritionBlue, Icons.Default.Restaurant))
            if (otherCoaches.isNotEmpty()) add(CoachCategory("Others", otherCoaches, Color(0xFF9333EA), Icons.Default.Person))
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Trainers & Experts", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refreshExperts) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ExpertPurpleLight)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = ExpertPurple)
                }
            } else if (allCoaches.isEmpty()) {
                ExpertsEmptyState()
            } else {
                // Category Tabs
                if (categories.size > 1) {
                    ScrollableTabRow(
                        selectedTabIndex = selectedTab.coerceIn(0, categories.lastIndex),
                        containerColor = ExpertPurpleLight,
                        contentColor = ExpertPurple,
                        edgePadding = 16.dp,
                        indicator = { tabPositions ->
                            if (selectedTab in tabPositions.indices) {
                                TabRowDefaults.SecondaryIndicator(
                                    Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                                    color = categories.getOrNull(selectedTab)?.color ?: ExpertPurple
                                )
                            }
                        }
                    ) {
                        categories.forEachIndexed { index, category ->
                            Tab(
                                selected = selectedTab == index,
                                onClick = { selectedTab = index },
                                text = {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(category.icon, null, modifier = Modifier.size(16.dp))
                                        Text(
                                            "${category.name} (${category.coaches.size})",
                                            fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal,
                                            fontSize = 13.sp
                                        )
                                    }
                                }
                            )
                        }
                    }
                }

                // Coach List
                val currentCategory = categories.getOrNull(selectedTab) ?: categories.first()
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(currentCategory.coaches) { coach ->
                        CoachDetailCard(coach = coach, accentColor = currentCategory.color, onClick = { onCoachClick(coach.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun CoachDetailCard(coach: WellnessCoachDto, accentColor: Color, onClick: () -> Unit = {}) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Profile Image
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(14.dp))
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
                        modifier = Modifier
                            .fillMaxSize()
                            .background(accentColor.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Person, null, tint = accentColor, modifier = Modifier.size(36.dp))
                    }
                }
                // Verified badge
                coach.rating?.let {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .offset(x = 4.dp, y = 4.dp),
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFFFC107)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Star, null, tint = Color.White, modifier = Modifier.size(10.dp))
                            Text(String.format("%.1f", it), fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            // Details
            Column(modifier = Modifier.weight(1f)) {
                Text(coach.name, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                coach.headline?.let {
                    Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Coach types
                coach.coachTypes?.let { types ->
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        items(types) { type ->
                            val displayName = type.replace("_", " ").split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
                            Surface(shape = RoundedCornerShape(16.dp), color = accentColor.copy(alpha = 0.12f)) {
                                Text(displayName, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = accentColor)
                            }
                        }
                    }
                }

                // Specialties
                coach.specialties?.takeIf { it.isNotEmpty() }?.let { specs ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        specs.joinToString(" • ") { it.replaceFirstChar { c -> c.uppercase() } },
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Bottom row: fee, reviews, city, languages
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    coach.sessionFee?.let { fee ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CurrencyRupee, null, tint = accentColor, modifier = Modifier.size(14.dp))
                            Text("${fee.toInt()}/session", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = accentColor)
                        }
                    }
                    coach.totalReviews?.let { reviews ->
                        Text("$reviews reviews", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    coach.city?.let { city ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Place, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
                            Text(city, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                // Languages
                coach.languages?.takeIf { it.isNotEmpty() }?.let { langs ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Speaks: ${langs.joinToString(", ")}",
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }
            }
        }
    }
}

@Composable
private fun ExpertsEmptyState() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Surface(shape = CircleShape, color = ExpertPurple.copy(alpha = 0.1f), modifier = Modifier.size(80.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Groups, null, tint = ExpertPurple, modifier = Modifier.size(40.dp))
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text("No Experts Yet", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Verified trainers, yoga instructors, and nutritionists will appear here after admin approval.",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}
