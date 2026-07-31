package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.WellnessReelDto
import com.example.swastik.ui.viewmodel.WellnessReelsViewModel
import java.util.Locale

private val WellnessGreen = Color(0xFF2E7D32)
private val WellnessGreenLight = Color(0xFFE8F5E9)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessReelsScreen(
    onBackClick: () -> Unit,
    onNavigateToCoach: (String) -> Unit,
    viewModel: WellnessReelsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Trainer Reels", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Black,
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
        ) {
            when {
                uiState.isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = WellnessGreen)
                    }
                }
                uiState.error != null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color.Red, modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(8.dp))
                            Text(uiState.error ?: "Something went wrong", color = Color.Gray)
                            Spacer(Modifier.height(12.dp))
                            TextButton(onClick = { viewModel.load() }) {
                                Text("Retry", color = WellnessGreen)
                            }
                        }
                    }
                }
                uiState.reels.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.PlayCircleOutline, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(12.dp))
                            Text("No reels yet", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = Color.Gray)
                            Text("Check back later for new trainer content", fontSize = 14.sp, color = Color.LightGray)
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        items(uiState.reels, key = { it.id }) { reel ->
                            ReelCard(
                                reel = reel,
                                isLiked = reel.id in uiState.likedIds,
                                viewModel = viewModel,
                                onNavigateToCoach = onNavigateToCoach
                            )
                        }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReelCard(
    reel: WellnessReelDto,
    isLiked: Boolean,
    viewModel: WellnessReelsViewModel,
    onNavigateToCoach: (String) -> Unit
) {
    LaunchedEffect(reel.id) {
        viewModel.recordView(reel.id)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
            ) {
                if (!reel.thumbnailUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = reel.thumbnailUrl,
                        contentDescription = reel.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Brush.linearGradient(listOf(Color(0xFF388E3C), Color(0xFF1B5E20)))),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Filled.PlayCircleOutline,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.8f),
                            modifier = Modifier.size(56.dp)
                        )
                    }
                }

                if (!reel.category.isNullOrBlank()) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(10.dp),
                        shape = RoundedCornerShape(8.dp),
                        color = Color.Black.copy(alpha = 0.6f)
                    ) {
                        Text(
                            reel.category,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                reel.durationSeconds?.let { seconds ->
                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(10.dp),
                        shape = RoundedCornerShape(6.dp),
                        color = Color.Black.copy(alpha = 0.6f)
                    ) {
                        Text(
                            formatDuration(seconds),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Column(modifier = Modifier.padding(16.dp)) {
                if (!reel.title.isNullOrBlank()) {
                    Text(reel.title, fontWeight = FontWeight.Bold, fontSize = 17.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Spacer(Modifier.height(4.dp))
                }

                if (!reel.description.isNullOrBlank()) {
                    Text(
                        reel.description,
                        fontSize = 14.sp,
                        color = Color(0xFF424242),
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.height(12.dp))
                }

                reel.coach?.let { coach ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .clickable(enabled = !coach.id.isNullOrBlank()) {
                                coach.id?.let(onNavigateToCoach)
                            }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(modifier = Modifier.size(40.dp).clip(CircleShape).background(WellnessGreenLight)) {
                            if (!coach.profileImageUrl.isNullOrBlank()) {
                                AsyncImage(
                                    model = coach.profileImageUrl,
                                    contentDescription = null,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Icon(
                                    Icons.Filled.Person,
                                    contentDescription = null,
                                    modifier = Modifier.align(Alignment.Center).size(22.dp),
                                    tint = WellnessGreen
                                )
                            }
                        }
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(coach.name ?: "Wellness Coach", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            if (!coach.headline.isNullOrBlank()) {
                                Text(coach.headline, fontSize = 12.sp, color = Color.Gray, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                        if (!coach.id.isNullOrBlank()) {
                            Spacer(Modifier.weight(1f))
                            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(20.dp))
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                }

                HorizontalDivider(color = Color(0xFFF0F0F0))
                Spacer(Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Visibility, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(formatCount(reel.viewsCount), fontSize = 13.sp, color = Color.Gray)

                    Spacer(Modifier.weight(1f))

                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { viewModel.like(reel.id) }
                            .padding(horizontal = 6.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            if (isLiked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = if (isLiked) "Unlike" else "Like",
                            tint = if (isLiked) Color(0xFFE53935) else Color.Gray,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            formatCount(reel.likesCount),
                            fontSize = 13.sp,
                            color = if (isLiked) Color(0xFFE53935) else Color.Gray,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }
}

private fun formatCount(count: Int?): String {
    val value = count ?: 0
    return when {
        value >= 1000000 -> String.format(Locale.US, "%.1fM", value / 1000000f).removeSuffix(".0")
        value >= 1000 -> String.format(Locale.US, "%.1fK", value / 1000f).removeSuffix(".0")
        else -> value.toString()
    }
}

private fun formatDuration(totalSeconds: Int): String {
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "$minutes:${seconds.toString().padStart(2, '0')}"
}
