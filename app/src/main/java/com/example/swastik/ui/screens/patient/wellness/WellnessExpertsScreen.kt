package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.animation.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.FilterList
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
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
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun WellnessExpertsScreen(
    onNavigateBack: () -> Unit,
    onCoachClick: (coachId: String) -> Unit = {},
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()
    var selectedCategoryIndex by remember { mutableIntStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedGoalTag by remember { mutableStateOf<String?>(null) }
    var showFilterSheet by remember { mutableStateOf(false) }

    // Filter states
    var maxPriceFilter by remember { mutableFloatStateOf(3000f) }
    var minRatingFilter by remember { mutableFloatStateOf(0f) }
    var selectedModeFilter by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { viewModel.refreshExperts() }

    val allCoaches = state.coaches

    // Filtered coaches logic
    val filteredCoaches = remember(allCoaches, searchQuery, selectedGoalTag, maxPriceFilter, minRatingFilter, selectedModeFilter, selectedCategoryIndex) {
        allCoaches.filter { coach ->
            // Category filter
            val matchesCategory = when (selectedCategoryIndex) {
                1 -> coach.coachTypes?.any { it.contains("personal_trainer", ignoreCase = true) || it.contains("trainer", ignoreCase = true) } == true
                2 -> coach.coachTypes?.any { it.contains("yoga", ignoreCase = true) } == true
                3 -> coach.coachTypes?.any { it.contains("nutritionist", ignoreCase = true) || it.contains("dietitian", ignoreCase = true) } == true
                4 -> coach.coachTypes?.none { 
                    it.contains("trainer", ignoreCase = true) || it.contains("yoga", ignoreCase = true) || it.contains("nutrition", ignoreCase = true) 
                } == true
                else -> true // All
            }

            // Search query
            val matchesSearch = searchQuery.isBlank() ||
                    coach.name.contains(searchQuery, ignoreCase = true) ||
                    coach.headline?.contains(searchQuery, ignoreCase = true) == true ||
                    coach.specialties?.any { it.contains(searchQuery, ignoreCase = true) } == true ||
                    coach.city?.contains(searchQuery, ignoreCase = true) == true

            // Goal tag
            val matchesGoal = selectedGoalTag == null ||
                    coach.specialties?.any { it.contains(selectedGoalTag!!, ignoreCase = true) } == true ||
                    coach.headline?.contains(selectedGoalTag!!, ignoreCase = true) == true

            // Price filter
            val matchesPrice = (coach.sessionFee ?: 0.0) <= maxPriceFilter

            // Rating filter
            val matchesRating = (coach.rating ?: 0.0) >= minRatingFilter

            // Mode filter
            val matchesMode = selectedModeFilter == null ||
                    coach.sessionModes?.any { it.contains(selectedModeFilter!!, ignoreCase = true) } == true

            matchesCategory && matchesSearch && matchesGoal && matchesPrice && matchesRating && matchesMode
        }
    }

    val goalTags = listOf("All", "Fat Loss", "PCOS / PCOD", "Postpartum", "Strength & Muscle", "Senior Yoga", "Diabetes Reversal", "Posture & Rehab")

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Trainers & Experts", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = WellnessTheme.TealDeep)
                        Text("Certified clinical trainers & nutritionists", fontSize = 11.sp, color = WellnessTheme.TealDark.copy(alpha = 0.8f))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = WellnessTheme.TealDeep)
                    }
                },
                actions = {
                    IconButton(onClick = { showFilterSheet = true }) {
                        val hasActiveFilters = maxPriceFilter < 3000f || minRatingFilter > 0f || selectedModeFilter != null
                        BadgedBox(
                            badge = {
                                if (hasActiveFilters) {
                                    Badge(containerColor = WellnessTheme.FitnessCoral)
                                }
                            }
                        ) {
                            Icon(Icons.Outlined.FilterList, contentDescription = "Filter", tint = WellnessTheme.TealDeep)
                        }
                    }
                    IconButton(onClick = viewModel::refreshExperts) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = WellnessTheme.TealDeep)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = WellnessTheme.TealSurface
                )
            )
        },
        containerColor = WellnessTheme.TealSurface
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Search Bar & Filter Bar
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Modern Teal Tinted Search Input
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color.White,
                        border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(16.dp), spotColor = WellnessTheme.TealBorder)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Search, contentDescription = null, tint = WellnessTheme.TealPrimary, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(10.dp))
                            TextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = { Text("Search by name, specialty, condition...", fontSize = 13.sp, color = Color.Gray) },
                                colors = TextFieldDefaults.colors(
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent,
                                    focusedIndicatorColor = Color.Transparent,
                                    unfocusedIndicatorColor = Color.Transparent
                                ),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { searchQuery = "" }, modifier = Modifier.size(24.dp)) {
                                    Icon(Icons.Default.Close, contentDescription = "Clear", tint = Color.Gray, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }

                    // Health Goals / Tags Quick Filter Row
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(vertical = 2.dp)
                    ) {
                        items(goalTags) { tag ->
                            val isSelected = (tag == "All" && selectedGoalTag == null) || (selectedGoalTag == tag)
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = if (isSelected) WellnessTheme.TealDark else Color.White,
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (isSelected) WellnessTheme.TealDark else WellnessTheme.TealBorder
                                ),
                                modifier = Modifier.clickable {
                                    selectedGoalTag = if (tag == "All") null else tag
                                }
                            ) {
                                Text(
                                    text = tag,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.White else WellnessTheme.TealDeep,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Featured Carousel (if coaches exist)
            if (allCoaches.isNotEmpty() && searchQuery.isBlank() && selectedGoalTag == null) {
                item {
                    val featuredCoaches = remember(allCoaches) { allCoaches.take(3) }
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Featured & Top Rated", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = WellnessTheme.TealDeep)
                            Text("Verified by Swastik", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = WellnessTheme.TealPrimary)
                        }
                        Spacer(Modifier.height(8.dp))
                        FeaturedCoachesCarousel(featuredCoaches, onCoachClick = onCoachClick)
                    }
                }
            }

            // Category Tab Row
            item {
                val categoryTabs = listOf("All", "Trainers", "Yoga", "Nutrition", "Others")
                ScrollableTabRow(
                    selectedTabIndex = selectedCategoryIndex,
                    containerColor = Color.Transparent,
                    contentColor = WellnessTheme.TealDark,
                    edgePadding = 16.dp,
                    divider = {},
                    indicator = { tabPositions ->
                        if (selectedCategoryIndex in tabPositions.indices) {
                            TabRowDefaults.SecondaryIndicator(
                                Modifier.tabIndicatorOffset(tabPositions[selectedCategoryIndex]),
                                color = WellnessTheme.TealDark,
                                height = 3.dp
                            )
                        }
                    }
                ) {
                    categoryTabs.forEachIndexed { index, title ->
                        val isSelected = selectedCategoryIndex == index
                        Tab(
                            selected = isSelected,
                            onClick = { selectedCategoryIndex = index },
                            text = {
                                Text(
                                    text = title,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    fontSize = 13.sp,
                                    color = if (isSelected) WellnessTheme.TealDark else Color(0xFF64748B)
                                )
                            }
                        )
                    }
                }
            }

            // Coach List Content or Skeleton Shimmer
            if (state.isLoading) {
                items(4) {
                    Box(modifier = Modifier.padding(horizontal = 16.dp)) {
                        ShimmerCoachCard()
                    }
                }
            } else if (filteredCoaches.isEmpty()) {
                item {
                    ExpertsEmptyState(
                        hasFilters = searchQuery.isNotBlank() || selectedGoalTag != null || minRatingFilter > 0f,
                        onReset = {
                            searchQuery = ""
                            selectedGoalTag = null
                            maxPriceFilter = 3000f
                            minRatingFilter = 0f
                            selectedModeFilter = null
                            selectedCategoryIndex = 0
                        }
                    )
                }
            } else {
                item {
                    Text(
                        "${filteredCoaches.size} verified expert${if (filteredCoaches.size > 1) "s" else ""} available",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF64748B),
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }
                items(filteredCoaches, key = { it.id }) { coach ->
                    Box(modifier = Modifier.padding(horizontal = 16.dp)) {
                        EnhancedCoachCard(
                            coach = coach,
                            onClick = { onCoachClick(coach.id) }
                        )
                    }
                }
            }
        }
    }

    // Filter Bottom Sheet
    if (showFilterSheet) {
        ModalBottomSheet(
            onDismissRequest = { showFilterSheet = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Filter Experts", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = WellnessTheme.TealDeep)
                    TextButton(onClick = {
                        maxPriceFilter = 3000f
                        minRatingFilter = 0f
                        selectedModeFilter = null
                    }) {
                        Text("Reset All", color = WellnessTheme.TealPrimary, fontWeight = FontWeight.SemiBold)
                    }
                }

                // Price Slider
                Column {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Max Session Fee", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        Text("₹${maxPriceFilter.toInt()}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = WellnessTheme.TealDark)
                    }
                    Slider(
                        value = maxPriceFilter,
                        onValueChange = { maxPriceFilter = it },
                        valueRange = 200f..3000f,
                        steps = 14,
                        colors = SliderDefaults.colors(
                            thumbColor = WellnessTheme.TealDark,
                            activeTrackColor = WellnessTheme.TealDark,
                            inactiveTrackColor = WellnessTheme.TealBorder
                        )
                    )
                }

                // Min Rating Filter
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Minimum Rating", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        listOf(0f to "Any", 4.0f to "4.0+ ★", 4.5f to "4.5+ ★", 4.8f to "4.8+ ★").forEach { (rating, label) ->
                            val isSelected = minRatingFilter == rating
                            FilterChip(
                                selected = isSelected,
                                onClick = { minRatingFilter = rating },
                                label = { Text(label, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = WellnessTheme.TealDark,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }

                // Session Mode Filter
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Consultation Mode", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        listOf(null to "All Modes", "video" to "Online Video", "in_person" to "In-Person").forEach { (mode, label) ->
                            val isSelected = selectedModeFilter == mode
                            FilterChip(
                                selected = isSelected,
                                onClick = { selectedModeFilter = mode },
                                label = { Text(label, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = WellnessTheme.TealDark,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }

                Button(
                    onClick = { showFilterSheet = false },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = WellnessTheme.TealDark)
                ) {
                    Text("Apply Filters", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

// ==================== FEATURED CAROUSEL ====================

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun FeaturedCoachesCarousel(
    coaches: List<WellnessCoachDto>,
    onCoachClick: (String) -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { coaches.size })

    LaunchedEffect(Unit) {
        while (true) {
            delay(4000)
            if (coaches.size > 1) {
                val next = (pagerState.currentPage + 1) % coaches.size
                pagerState.animateScrollToPage(next)
            }
        }
    }

    HorizontalPager(
        state = pagerState,
        contentPadding = PaddingValues(horizontal = 16.dp),
        pageSpacing = 12.dp,
        modifier = Modifier.fillMaxWidth()
    ) { page ->
        val coach = coaches[page]
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = WellnessTheme.TealDeep,
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onCoachClick(coach.id) }
                .shadow(4.dp, RoundedCornerShape(20.dp), spotColor = WellnessTheme.TealDeep)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(WellnessTheme.HeroGradient)
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Coach Avatar with glowing ring
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .border(2.dp, WellnessTheme.TealMint, CircleShape)
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
                                modifier = Modifier.fillMaxSize().background(WellnessTheme.TealDark),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Person, null, tint = Color.White, modifier = Modifier.size(36.dp))
                            }
                        }
                    }

                    // Coach Info
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(coach.name, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color.White)
                            Icon(Icons.Default.Verified, null, tint = WellnessTheme.TealMint, modifier = Modifier.size(15.dp))
                        }
                        Text(
                            coach.headline ?: "Certified Health & Fitness Expert",
                            fontSize = 11.sp,
                            color = Color(0xFFCCFBF1),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(Modifier.height(6.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            coach.rating?.let {
                                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF115E59)) {
                                    Row(modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Star, null, tint = WellnessTheme.StarYellow, modifier = Modifier.size(11.dp))
                                        Spacer(Modifier.width(3.dp))
                                        Text(String.format("%.1f", it), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                }
                            }
                            LiveAvailabilityPill(isAvailableToday = true)
                        }
                    }

                    // Book Action Button
                    Surface(
                        shape = CircleShape,
                        color = WellnessTheme.TealMint,
                        modifier = Modifier.size(38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.ArrowForward, null, tint = WellnessTheme.TealDeep, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}

// ==================== ENHANCED COACH CARD ====================

@Composable
private fun EnhancedCoachCard(
    coach: WellnessCoachDto,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorderLight),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .shadow(elevation = 2.dp, shape = RoundedCornerShape(20.dp), spotColor = WellnessTheme.TealBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Coach Profile Photo with Rating Overlay
                Box(
                    modifier = Modifier
                        .size(84.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .border(1.5.dp, WellnessTheme.TealBorder, RoundedCornerShape(16.dp))
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
                                .background(WellnessTheme.TealSurfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Person, null, tint = WellnessTheme.TealDark, modifier = Modifier.size(40.dp))
                        }
                    }

                    // Verified Checkmark
                    Icon(
                        Icons.Default.Verified,
                        contentDescription = "Verified",
                        tint = WellnessTheme.TealPrimary,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(4.dp)
                            .size(16.dp)
                    )
                }

                // Details Column
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Text(
                            coach.name,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 16.sp,
                            color = WellnessTheme.TealDeep,
                            modifier = Modifier.weight(1f)
                        )
                        coach.rating?.let {
                            TealRatingBadge(rating = it, reviewCount = coach.totalReviews)
                        }
                    }

                    coach.headline?.let {
                        Text(
                            it,
                            fontSize = 12.sp,
                            color = Color(0xFF475569),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Spacer(Modifier.height(6.dp))

                    // Coach Types & Specialties Chips
                    val displayChips = (coach.coachTypes.orEmpty() + coach.specialties.orEmpty()).take(3)
                    if (displayChips.isNotEmpty()) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            displayChips.forEach { chip ->
                                val cleanChip = chip.replace("_", " ").split(" ").joinToString(" ") { word -> word.replaceFirstChar { it.uppercase() } }
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = WellnessTheme.TealSurfaceVariant
                                ) {
                                    Text(
                                        cleanChip,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = WellnessTheme.TealDark,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            HorizontalDivider(color = Color(0xFFF1F5F9), thickness = 0.8.dp)

            // Bottom Metric & Action Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Fee & City
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if ((coach.sessionFee ?: 0.0) > 0) "₹${coach.sessionFee?.toInt()}" else "Free",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = WellnessTheme.TealDeep
                        )
                        Text(" / session", fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                    coach.city?.let { city ->
                        Text("📍 $city", fontSize = 10.sp, color = Color(0xFF94A3B8))
                    }
                }

                // Action Button: Direct Book Slot
                Button(
                    onClick = onClick,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = WellnessTheme.TealDark),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    modifier = Modifier.height(38.dp)
                ) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Book Slot", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ==================== EMPTY STATE ====================

@Composable
private fun ExpertsEmptyState(
    hasFilters: Boolean = false,
    onReset: () -> Unit = {}
) {
    Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Surface(shape = CircleShape, color = WellnessTheme.TealSurfaceVariant, modifier = Modifier.size(76.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Groups, null, tint = WellnessTheme.TealDark, modifier = Modifier.size(38.dp))
                }
            }
            Text(
                if (hasFilters) "No Matching Experts Found" else "No Experts Yet",
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = WellnessTheme.TealDeep
            )
            Text(
                if (hasFilters) "Try adjusting your search criteria or price/rating filters." else "Verified trainers, yoga instructors, and nutritionists will appear here after admin approval.",
                fontSize = 13.sp,
                color = Color(0xFF64748B),
                textAlign = TextAlign.Center
            )
            if (hasFilters) {
                OutlinedButton(
                    onClick = onReset,
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealDark)
                ) {
                    Text("Clear All Filters", color = WellnessTheme.TealDark, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
