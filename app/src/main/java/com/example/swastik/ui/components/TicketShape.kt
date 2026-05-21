package com.example.swastik.ui.components

import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp

class TicketShape(
    private val cornerRadius: Dp = 16.dp,
    private val cutoutRadius: Dp = 12.dp,
    private val cutoutPositionRatio: Float = 0.7f // Vertical position of cutout (0.0 to 1.0)
) : Shape {
    override fun createOutline(
        size: Size,
        layoutDirection: LayoutDirection,
        density: Density
    ): Outline {
        val cornerRadiusPx = with(density) { cornerRadius.toPx() }
        val cutoutRadiusPx = with(density) { cutoutRadius.toPx() }
        val cutoutY = size.height * cutoutPositionRatio

        val path = Path().apply {
            // Top Left Corner
            moveTo(0f, cornerRadiusPx)
            quadraticBezierTo(0f, 0f, cornerRadiusPx, 0f)

            // Top Right Corner
            lineTo(size.width - cornerRadiusPx, 0f)
            quadraticBezierTo(size.width, 0f, size.width, cornerRadiusPx)

            // Right Cutout
            lineTo(size.width, cutoutY - cutoutRadiusPx)
            arcTo(
                rect = Rect(
                    left = size.width - cutoutRadiusPx,
                    top = cutoutY - cutoutRadiusPx,
                    right = size.width + cutoutRadiusPx,
                    bottom = cutoutY + cutoutRadiusPx
                ),
                startAngleDegrees = 270f,
                sweepAngleDegrees = -180f,
                forceMoveTo = false
            )

            // Bottom Right Corner
            lineTo(size.width, size.height - cornerRadiusPx)
            quadraticBezierTo(size.width, size.height, size.width - cornerRadiusPx, size.height)

            // Bottom Left Corner
            lineTo(cornerRadiusPx, size.height)
            quadraticBezierTo(0f, size.height, 0f, size.height - cornerRadiusPx)

            // Left Cutout
            lineTo(0f, cutoutY + cutoutRadiusPx)
            arcTo(
                rect = Rect(
                    left = -cutoutRadiusPx,
                    top = cutoutY - cutoutRadiusPx,
                    right = cutoutRadiusPx,
                    bottom = cutoutY + cutoutRadiusPx
                ),
                startAngleDegrees = 90f,
                sweepAngleDegrees = -180f,
                forceMoveTo = false
            )

            // Back to start
            lineTo(0f, cornerRadiusPx)
            close()
        }

        return Outline.Generic(path)
    }
}
