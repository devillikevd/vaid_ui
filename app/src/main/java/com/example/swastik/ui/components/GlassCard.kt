package com.example.swastik.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(24.dp),
    onClick: (() -> Unit)? = null,
    elevation: Dp = 4.dp,
    containerColor: Color? = null,
    contentPadding: Dp = 0.dp,
    content: @Composable () -> Unit
) {
    val isLight = !isSystemInDarkTheme()
    val defaultContainerColor = MaterialTheme.colorScheme.surface
    val baseColor = containerColor ?: defaultContainerColor
    
    // Gradient for the glassy shine effect
    val glassBrush = Brush.linearGradient(
        colors = if (isLight) {
            listOf(
                Color.White.copy(alpha = 0.7f),
                Color.White.copy(alpha = 0.0f)
            )
        } else {
            listOf(
                Color.White.copy(alpha = 0.15f),
                Color.White.copy(alpha = 0.0f)
            )
        }
    )

    // A thin, bright border to act as a rim light
    val borderBrush = Brush.linearGradient(
        colors = if (isLight) {
            listOf(
                Color.White,
                Color.White.copy(alpha = 0.5f)
            )
        } else {
            listOf(
                Color.White.copy(alpha = 0.3f),
                Color.White.copy(alpha = 0.05f)
            )
        }
    )

    var containerModifier = modifier
        .shadow(
            elevation = elevation,
            shape = shape,
            spotColor = if (isLight) Color.Black.copy(alpha = 0.05f) else Color.Black,
            ambientColor = Color.Transparent
        )
        .clip(shape)
        .background(baseColor)
        .background(glassBrush)
        .border(BorderStroke(1.5.dp, borderBrush), shape)

    if (onClick != null) {
        containerModifier = containerModifier.clickable { onClick() }
    }

    Box(modifier = containerModifier.padding(contentPadding)) {
        content()
    }
}
