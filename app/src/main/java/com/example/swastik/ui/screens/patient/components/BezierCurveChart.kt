package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ui.theme.SwastikPrimary

@Composable
fun BezierCurveChart(
    dataPoints: List<Float>,
    modifier: Modifier = Modifier,
    lineColor: Color = SwastikPrimary,
    title: String = "Health Chart",
    subtitle: String = "Recent Trend",
    containerColor: Color = MaterialTheme.colorScheme.surface
) {
    // Early return removed to allow rendering empty state

    androidx.compose.material3.Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = androidx.compose.material3.CardDefaults.cardColors(
            containerColor = containerColor
        ),
        elevation = androidx.compose.material3.CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = subtitle,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            if (dataPoints.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp)
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), 
                            RoundedCornerShape(8.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        androidx.compose.material3.Icon(
                            androidx.compose.material.icons.Icons.Default.Info,
                            contentDescription = "No data",
                            tint = MaterialTheme.colorScheme.outlineVariant,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No data available yet.\nSync your smartwatch to see trends!",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            } else {
                val onPrimaryColor = MaterialTheme.colorScheme.onPrimary
                Canvas(modifier = Modifier.fillMaxWidth().height(120.dp)) {
                    val width = size.width
                    val height = size.height
                    val maxData = dataPoints.maxOrNull() ?: 1f
                    val minData = dataPoints.minOrNull() ?: 0f
                    val range = maxData - minData
                    val scaledRange = if (range == 0f) 1f else range

                    val points = dataPoints.mapIndexed { index, value ->
                        val x = (index.toFloat() / (dataPoints.size - 1)) * width
                        val y = height - ((value - minData) / scaledRange) * height
                        Offset(x, y)
                    }

                    val path = Path()
                    path.moveTo(points.first().x, points.first().y)

                    for (i in 0 until points.size - 1) {
                        val start = points[i]
                        val end = points[i + 1]
                        val controlX = (start.x + end.x) / 2
                        path.cubicTo(
                            controlX, start.y,
                            controlX, end.y,
                            end.x, end.y
                        )
                    }

                    // Draw line
                    drawPath(
                        path = path,
                        color = lineColor,
                        style = Stroke(width = 4.dp.toPx())
                    )

                    // Fill gradient below curve
                    val fillPath = Path().apply {
                        addPath(path)
                        lineTo(width, height)
                        lineTo(0f, height)
                        close()
                    }
                    
                    drawPath(
                        path = fillPath,
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                lineColor.copy(alpha = 0.3f),
                                Color.Transparent
                            ),
                            startY = 0f,
                            endY = height
                        )
                    )
                    
                    // Draw data points
                    points.forEach { point ->
                        drawCircle(
                            color = onPrimaryColor,
                            radius = 4.dp.toPx(),
                            center = point
                        )
                        drawCircle(
                            color = lineColor,
                            radius = 4.dp.toPx(),
                            center = point,
                            style = Stroke(width = 2.dp.toPx())
                        )
                    }
                }
            }
        }
    }
}
