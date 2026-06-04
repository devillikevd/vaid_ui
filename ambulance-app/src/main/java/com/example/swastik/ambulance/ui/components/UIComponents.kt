package com.example.swastik.ambulance.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Modifier for creating a pulsing animation effect, useful for highlighting active SOS requests.
 */
fun Modifier.pulsingEffect(
    targetScale: Float = 1.05f,
    durationMillis: Int = 800
): Modifier = composed {
    val infiniteTransition = rememberInfiniteTransition(label = "pulsing")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = targetScale,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    this.scale(scale)
}

/**
 * Modifier for creating a shimmer effect for skeleton loading.
 */
fun Modifier.shimmerEffect(): Modifier = composed {
    val shimmerColors = listOf(
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f),
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
    )

    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "translate"
    )

    this.background(
        brush = Brush.linearGradient(
            colors = shimmerColors,
            start = Offset.Zero,
            end = Offset(x = translateAnim, y = translateAnim)
        )
    )
}

/**
 * A horizontal stepper to visualize the emergency status progression.
 */
@Composable
fun StatusStepper(currentStatus: String, modifier: Modifier = Modifier) {
    val steps = listOf("assigned", "en_route", "arrived", "picked_up", "en_route_hospital", "arrived_hospital", "completed")
    val labels = listOf("Assigned", "En Route", "Arrived", "Picked Up", "To Hospital", "At Hospital", "Done")
    
    val currentIndex = steps.indexOf(currentStatus).coerceAtLeast(0)
    // Simplify for display to 4 main phases: Assigned -> En Route -> Arrived/Picked Up -> Hospital
    val displaySteps = listOf(
        Pair("Assigned", currentIndex >= 0),
        Pair("En Route", currentIndex >= 1),
        Pair("Patient", currentIndex >= 2), // Covers arrived / picked up
        Pair("Hospital", currentIndex >= 4)
    )

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        displaySteps.forEachIndexed { index, step ->
            val isActive = step.second
            val isPast = index < displaySteps.indexOfLast { it.second } || currentStatus == "completed"
            
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(
                            if (isActive) MaterialTheme.colorScheme.primary 
                            else MaterialTheme.colorScheme.surfaceVariant
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (isPast) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(14.dp)
                        )
                    } else if (isActive) {
                        Box(modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(Color.White))
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = step.first,
                    fontSize = 10.sp,
                    fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (isActive) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                )
            }

            if (index < displaySteps.size - 1) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(2.dp)
                        .padding(horizontal = 4.dp)
                        .background(
                            if (displaySteps[index + 1].second) MaterialTheme.colorScheme.primary 
                            else MaterialTheme.colorScheme.surfaceVariant
                        )
                )
            }
        }
    }
}
