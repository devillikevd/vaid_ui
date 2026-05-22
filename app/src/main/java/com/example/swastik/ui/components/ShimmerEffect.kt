package com.example.swastik.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.ui.Alignment

/**
 * A reusable shimmer loading effect that replaces boring spinners
 * with a beautiful, premium animated placeholder.
 */
@Composable
fun ShimmerEffect(
    modifier: Modifier = Modifier,
    widthOfShimmerDp: Dp = 200.dp,
    content: @Composable (Brush) -> Unit
) {
    val shimmerColors = listOf(
        Color(0xFFEBEBF4).copy(alpha = 0.5f),
        Color(0xFFF4F4F8).copy(alpha = 0.8f),
        Color(0xFFEBEBF4).copy(alpha = 0.5f)
    )

    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnimation = transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = 1200,
                easing = FastOutSlowInEasing
            ),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_translate"
    )

    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset.Zero,
        end = Offset(x = translateAnimation.value, y = translateAnimation.value)
    )

    content(brush)
}

// ─── Pre-built shimmer shapes ───

@Composable
fun ShimmerBox(
    modifier: Modifier = Modifier,
    height: Dp = 16.dp,
    cornerRadius: Dp = 8.dp
) {
    ShimmerEffect { brush ->
        Box(
            modifier = modifier
                .height(height)
                .clip(RoundedCornerShape(cornerRadius))
                .background(brush)
        )
    }
}

@Composable
fun ShimmerCircle(
    modifier: Modifier = Modifier,
    size: Dp = 48.dp
) {
    ShimmerEffect { brush ->
        Box(
            modifier = modifier
                .size(size)
                .clip(CircleShape)
                .background(brush)
        )
    }
}

/**
 * A full doctor card shimmer placeholder — replaces the loading spinner
 * on the Home screen and Doctor search results.
 */
@Composable
fun DoctorCardShimmer(modifier: Modifier = Modifier) {
    ShimmerEffect { brush ->
        Row(
            modifier = modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(brush)
            )
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Name
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.6f)
                        .height(14.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(brush)
                )
                // Specialization
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.4f)
                        .height(12.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(brush)
                )
                // Rating row
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.3f)
                        .height(10.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(brush)
                )
            }
        }
    }
}

/**
 * A section of multiple shimmer cards stacked vertically — use as a
 * loading placeholder for any list screen.
 */
@Composable
fun ShimmerCardList(
    modifier: Modifier = Modifier,
    cardCount: Int = 4
) {
    Column(
        modifier = modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        repeat(cardCount) {
            DoctorCardShimmer()
        }
    }
}

@Composable
fun MedicineListShimmer(
    modifier: Modifier = Modifier,
    count: Int = 4
) {
    Column(
        modifier = modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        repeat(count) {
            ShimmerEffect { brush ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(modifier = Modifier.width(150.dp).height(16.dp).clip(RoundedCornerShape(4.dp)).background(brush))
                            Box(modifier = Modifier.width(80.dp).height(14.dp).clip(RoundedCornerShape(4.dp)).background(brush))
                        }
                        Box(modifier = Modifier.size(24.dp).clip(CircleShape).background(brush))
                    }
                }
            }
        }
    }
}

@Composable
fun RecordsListShimmer(
    modifier: Modifier = Modifier,
    count: Int = 4
) {
    Column(
        modifier = modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        repeat(count) {
            ShimmerEffect { brush ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(16.dp),
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(brush))
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(modifier = Modifier.fillMaxWidth(0.7f).height(16.dp).clip(RoundedCornerShape(4.dp)).background(brush))
                        Box(modifier = Modifier.fillMaxWidth(0.4f).height(14.dp).clip(RoundedCornerShape(4.dp)).background(brush))
                    }
                }
            }
        }
    }
}

@Composable
fun CommunityQAShimmer(modifier: Modifier = Modifier) {
    ShimmerEffect { brush ->
        Card(
            modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(40.dp).clip(CircleShape).background(brush))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Box(modifier = Modifier.height(16.dp).fillMaxWidth(0.4f).background(brush, RoundedCornerShape(4.dp)))
                        Spacer(modifier = Modifier.height(4.dp))
                        Box(modifier = Modifier.height(12.dp).fillMaxWidth(0.2f).background(brush, RoundedCornerShape(4.dp)))
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Box(modifier = Modifier.height(20.dp).fillMaxWidth(0.9f).background(brush, RoundedCornerShape(4.dp)))
                Spacer(modifier = Modifier.height(8.dp))
                Box(modifier = Modifier.height(14.dp).fillMaxWidth(0.6f).background(brush, RoundedCornerShape(4.dp)))
                Spacer(modifier = Modifier.height(16.dp))
                Row {
                    Box(modifier = Modifier.height(24.dp).width(60.dp).background(brush, RoundedCornerShape(12.dp)))
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(modifier = Modifier.height(24.dp).width(80.dp).background(brush, RoundedCornerShape(12.dp)))
                }
            }
        }
    }
}

@Composable
fun ReminderShimmer(modifier: Modifier = Modifier) {
    ShimmerEffect { brush ->
        Card(
            modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(48.dp).background(brush, RoundedCornerShape(12.dp)))
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Box(modifier = Modifier.height(16.dp).fillMaxWidth(0.7f).background(brush, RoundedCornerShape(4.dp)))
                    Spacer(modifier = Modifier.height(6.dp))
                    Box(modifier = Modifier.height(14.dp).fillMaxWidth(0.4f).background(brush, RoundedCornerShape(4.dp)))
                }
            }
        }
    }
}
