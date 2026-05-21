package com.example.swastik.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.airbnb.lottie.compose.LottieAnimation
import com.airbnb.lottie.compose.LottieCompositionSpec
import com.airbnb.lottie.compose.LottieConstants
import com.airbnb.lottie.compose.animateLottieCompositionAsState
import com.airbnb.lottie.compose.rememberLottieComposition
import com.example.swastik.ui.theme.SwastikPrimary

@Composable
fun EmptyStateView(
    title: String,
    subtitle: String,
    lottieRawRes: Int? = null,
    icon: ImageVector? = null,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit = {}
) {
    // Gentle breathing animation for the icon
    val infiniteTransition = rememberInfiniteTransition(label = "empty_state_breathe")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = 2500,
                easing = FastOutSlowInEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "empty_state_scale"
    )
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = 2500,
                easing = FastOutSlowInEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "empty_state_alpha"
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (lottieRawRes != null) {
            val composition by rememberLottieComposition(LottieCompositionSpec.RawRes(lottieRawRes))
            val progress by animateLottieCompositionAsState(
                composition = composition,
                iterations = LottieConstants.IterateForever
            )
            LottieAnimation(
                composition = composition,
                progress = { progress },
                modifier = Modifier.size(200.dp)
            )
        } else if (icon != null) {
            // Upgraded: Premium floating icon with soft glow background
            Box(
                modifier = Modifier
                    .scale(scale)
                    .size(120.dp),
                contentAlignment = Alignment.Center
            ) {
                // Outer soft glow circle
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(CircleShape)
                        .alpha(alpha * 0.4f)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    SwastikPrimary.copy(alpha = 0.15f),
                                    Color.Transparent
                                )
                            )
                        )
                )
                // Inner colored circle
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    SwastikPrimary.copy(alpha = 0.12f),
                                    SwastikPrimary.copy(alpha = 0.06f)
                                )
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        modifier = Modifier.size(40.dp),
                        tint = SwastikPrimary.copy(alpha = 0.7f)
                    )
                }
            }
        } else {
            // Fallback empty space
            Spacer(modifier = Modifier.height(100.dp))
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = title,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(10.dp))

        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.55f),
            textAlign = TextAlign.Center,
            lineHeight = 22.sp
        )

        Spacer(modifier = Modifier.height(20.dp))
        content()
    }
}
