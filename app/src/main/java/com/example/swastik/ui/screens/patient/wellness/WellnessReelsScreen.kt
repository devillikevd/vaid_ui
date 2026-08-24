package com.example.swastik.ui.screens.patient.wellness

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.WellnessReelDto
import com.example.swastik.ui.components.VideoReelPlayer
import com.example.swastik.ui.viewmodel.WellnessReelsViewModel
import com.example.swastik.util.toResolvedMediaUrl
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

private val ReelsTealPrimary = Color(0xFF0D9488)
private val ReelsTealMint = Color(0xFF14B8A6)
private val Categories = listOf("All", "Fitness", "Yoga", "Nutrition", "HIIT", "Strength", "Mobility")

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun WellnessReelsScreen(
    onBackClick: () -> Unit,
    onNavigateToCoach: (String) -> Unit,
    viewModel: WellnessReelsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var selectedCategory by remember { mutableStateOf("All") }
    var isMuted by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        when {
            uiState.isLoading && uiState.reels.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = ReelsTealMint)
                }
            }
            uiState.error != null && uiState.reels.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Icon(
                            Icons.Filled.ErrorOutline,
                            contentDescription = null,
                            tint = Color(0xFFEF4444),
                            modifier = Modifier.size(54.dp)
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            uiState.error ?: "Unable to load trainer reels",
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.height(16.dp))
                        Button(
                            onClick = { viewModel.load(if (selectedCategory == "All") null else selectedCategory.lowercase()) },
                            colors = ButtonDefaults.buttonColors(containerColor = ReelsTealPrimary)
                        ) {
                            Text("Retry")
                        }
                    }
                }
            }
            uiState.reels.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Icon(
                            Icons.Filled.PlayCircleOutline,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.5f),
                            modifier = Modifier.size(72.dp)
                        )
                        Spacer(Modifier.height(14.dp))
                        Text("No Reels Available", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color.White)
                        Spacer(Modifier.height(6.dp))
                        Text("Check back soon for new workouts and tips", fontSize = 14.sp, color = Color.White.copy(alpha = 0.7f))
                    }
                }
            }
            else -> {
                val pagerState = rememberPagerState(pageCount = { uiState.reels.size })

                VerticalPager(
                    state = pagerState,
                    modifier = Modifier.fillMaxSize()
                ) { pageIndex ->
                    val reel = uiState.reels[pageIndex]
                    val isCurrentPage = pagerState.currentPage == pageIndex

                    SingleReelPage(
                        reel = reel,
                        isPlaying = isCurrentPage,
                        isMuted = isMuted,
                        isLiked = reel.id in uiState.likedIds,
                        onToggleMute = { isMuted = !isMuted },
                        onLikeClick = { viewModel.like(reel.id) },
                        onShareClick = {
                            val sendIntent = Intent().apply {
                                action = Intent.ACTION_SEND
                                putExtra(
                                    Intent.EXTRA_TEXT,
                                    "Check out this wellness reel on Vaididea: ${reel.title}\n${reel.videoUrl.toResolvedMediaUrl() ?: ""}"
                                )
                                type = "text/plain"
                            }
                            context.startActivity(Intent.createChooser(sendIntent, "Share Reel"))
                        },
                        onNavigateToCoach = onNavigateToCoach,
                        onViewRecorded = { viewModel.recordView(reel.id) }
                    )
                }
            }
        }

        // ═══════════════════════════════════════════════════════════
        // Top Floating Bar: Back Button, Title, and Category Pills
        // ═══════════════════════════════════════════════════════════
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.Black.copy(alpha = 0.8f),
                            Color.Transparent
                        )
                    )
                )
                .padding(vertical = 8.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBackClick) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White
                    )
                }

                Text(
                    text = "Vaididea Reels",
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp
                )

                Spacer(Modifier.weight(1f))

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = ReelsTealPrimary.copy(alpha = 0.85f)
                ) {
                    Text(
                        "HD ⚡",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(Modifier.height(6.dp))

            // Category Filter Strip
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(Categories) { category ->
                    val isSelected = selectedCategory == category
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) ReelsTealPrimary else Color.White.copy(alpha = 0.18f),
                        border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.25f)),
                        modifier = Modifier.clickable {
                            selectedCategory = category
                            viewModel.load(if (category == "All") null else category.lowercase())
                        }
                    ) {
                        Text(
                            text = category,
                            color = Color.White,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SingleReelPage(
    reel: WellnessReelDto,
    isPlaying: Boolean,
    isMuted: Boolean,
    isLiked: Boolean,
    onToggleMute: () -> Unit,
    onLikeClick: () -> Unit,
    onShareClick: () -> Unit,
    onNavigateToCoach: (String) -> Unit,
    onViewRecorded: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val resolvedVideoUrl = remember(reel.videoUrl) { reel.videoUrl.toResolvedMediaUrl() }
    val resolvedThumbnailUrl = remember(reel.thumbnailUrl) { reel.thumbnailUrl.toResolvedMediaUrl() }

    var showHeartAnimation by remember { mutableStateOf(false) }
    var isExpandedDescription by remember { mutableStateOf(false) }

    LaunchedEffect(isPlaying) {
        if (isPlaying) {
            onViewRecorded()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(
                    onDoubleTap = {
                        if (!isLiked) {
                            onLikeClick()
                        }
                        showHeartAnimation = true
                        coroutineScope.launch {
                            delay(800)
                            showHeartAnimation = false
                        }
                    }
                )
            }
    ) {
        // 1️⃣ Background Video Player or High-Res Fallback
        if (!resolvedVideoUrl.isNullOrBlank()) {
            VideoReelPlayer(
                videoUrl = resolvedVideoUrl,
                playWhenReady = isPlaying,
                isMuted = isMuted,
                modifier = Modifier.fillMaxSize()
            )
        } else if (!resolvedThumbnailUrl.isNullOrBlank()) {
            AsyncImage(
                model = resolvedThumbnailUrl,
                contentDescription = reel.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Color(0xFF0F172A),
                                Color(0xFF1E293B)
                            )
                        )
                    )
            )
        }

        // Gradient Dark Overlays
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0.0f to Color.Transparent,
                        0.45f to Color.Transparent,
                        0.75f to Color.Black.copy(alpha = 0.5f),
                        1.0f to Color.Black.copy(alpha = 0.9f)
                    )
                )
        )

        // 2️⃣ Double-Tap Heart Burst Animation
        AnimatedVisibility(
            visible = showHeartAnimation,
            enter = scaleIn(animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)) + fadeIn(),
            exit = scaleOut() + fadeOut(),
            modifier = Modifier.align(Alignment.Center)
        ) {
            Icon(
                Icons.Filled.Favorite,
                contentDescription = null,
                tint = Color(0xFFEF4444),
                modifier = Modifier.size(100.dp)
            )
        }

        // 3️⃣ Right Floating Actions Column (Like, Share, Mute, Views)
        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 14.dp, bottom = 90.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            // Like Action
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.clickable { onLikeClick() }
            ) {
                Surface(
                    shape = CircleShape,
                    color = Color.Black.copy(alpha = 0.45f),
                    modifier = Modifier.size(46.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            if (isLiked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = "Like",
                            tint = if (isLiked) Color(0xFFEF4444) else Color.White,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = formatCount(reel.likesCount),
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Sound Toggle (Mute/Unmute)
            Surface(
                shape = CircleShape,
                color = Color.Black.copy(alpha = 0.45f),
                modifier = Modifier
                    .size(46.dp)
                    .clickable { onToggleMute() }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        if (isMuted) Icons.AutoMirrored.Filled.VolumeOff else Icons.AutoMirrored.Filled.VolumeUp,
                        contentDescription = "Mute Toggle",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            // Share Action
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.clickable { onShareClick() }
            ) {
                Surface(
                    shape = CircleShape,
                    color = Color.Black.copy(alpha = 0.45f),
                    modifier = Modifier.size(46.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Filled.Share,
                            contentDescription = "Share",
                            tint = Color.White,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Share",
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            // Views Counter
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Filled.Visibility,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.8f),
                    modifier = Modifier.size(22.dp)
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = formatCount(reel.viewsCount),
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 11.sp
                )
            }
        }

        // 4️⃣ Bottom Meta Information (Coach, Title, Description, Category)
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth(0.82f)
                .padding(start = 16.dp, bottom = 28.dp)
        ) {
            // Coach Tag
            reel.coach?.let { coach ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color.Black.copy(alpha = 0.4f))
                        .clickable(enabled = !coach.id.isNullOrBlank()) {
                            coach.id?.let(onNavigateToCoach)
                        }
                        .padding(horizontal = 8.dp, vertical = 5.dp)
                ) {
                    val resolvedCoachPhoto = coach.profileImageUrl.toResolvedMediaUrl()
                    if (!resolvedCoachPhoto.isNullOrBlank()) {
                        AsyncImage(
                            model = resolvedCoachPhoto,
                            contentDescription = coach.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(ReelsTealPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = (coach.name?.take(1) ?: "C").uppercase(),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }

                    Spacer(Modifier.width(8.dp))

                    Text(
                        text = coach.name ?: "Vaididea Coach",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )

                    Spacer(Modifier.width(6.dp))

                    Text(
                        text = "Follow +",
                        color = ReelsTealMint,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 11.sp
                    )
                }
                Spacer(Modifier.height(8.dp))
            }

            // Title
            if (!reel.title.isNullOrBlank()) {
                Text(
                    text = reel.title,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(4.dp))
            }

            // Expandable Description
            if (!reel.description.isNullOrBlank()) {
                Text(
                    text = reel.description,
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 13.sp,
                    maxLines = if (isExpandedDescription) 6 else 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.clickable { isExpandedDescription = !isExpandedDescription }
                )
                Spacer(Modifier.height(6.dp))
            }

            // Category & Duration Pills
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (!reel.category.isNullOrBlank()) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color.White.copy(alpha = 0.2f)
                    ) {
                        Text(
                            text = "#${reel.category}",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                reel.durationSeconds?.let { sec ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color.White.copy(alpha = 0.2f)
                    ) {
                        Text(
                            text = formatDuration(sec),
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
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
