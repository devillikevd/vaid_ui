package com.example.swastik.ui.screens.patient.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.RectangleShape

fun Modifier.shimmerEffect(
    shape: Shape = RectangleShape,
    baseColor: Color = Color(0xFFE0E0E0),
    highlightColor: Color = Color(0xFFF5F5F5)
): Modifier = composed {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim = transition.animateFloat(
        initialValue = -1000f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_translate"
    )

    val brush = Brush.linearGradient(
        colors = listOf(baseColor, highlightColor, baseColor),
        start = Offset(translateAnim.value - 200f, translateAnim.value - 200f),
        end = Offset(translateAnim.value, translateAnim.value)
    )

    this.background(brush = brush, shape = shape)
}
