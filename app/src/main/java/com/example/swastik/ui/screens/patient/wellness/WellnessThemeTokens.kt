package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ==================== TEAL TINTED DESIGN TOKENS ====================

object WellnessTheme {
    // Primary Teals
    val TealDeep = Color(0xFF042F2E)       // Darkest teal for high-contrast headers
    val TealDark = Color(0xFF0F766E)       // Deep teal for buttons & primary accents
    val TealPrimary = Color(0xFF0D9488)    // Main active teal
    val TealLight = Color(0xFF14B8A6)      // Bright teal for highlights
    val TealMint = Color(0xFF2DD4BF)       // Vibrant mint for tags & glows
    
    // Background Tints
    val TealSurface = Color(0xFFF0FDFA)    // Softest teal background (100)
    val TealSurfaceVariant = Color(0xFFCCFBF1) // Subtle card highlight (200)
    val TealBorder = Color(0xFF99F6E4)     // Border stroke (300)
    val TealBorderLight = Color(0xFFE6FFFA)
    
    // Accents
    val FitnessCoral = Color(0xFFF43F5E)   // Dynamic coral for high-intensity fitness
    val YogaAmber = Color(0xFFF59E0B)      // Zen warm amber for yoga & meditation
    val NutritionBlue = Color(0xFF0284C7)  // Scientific blue for diet & nutrition
    val StarYellow = Color(0xFFFFB800)     // Golden yellow for ratings
    val SuccessGreen = Color(0xFF10B981)   // Live status & verified checkmarks

    // Glassmorphic Gradients
    val HeroGradient = Brush.verticalGradient(
        colors = listOf(TealDeep, Color(0xFF115E59), TealDark)
    )
    val CardGradient = Brush.linearGradient(
        colors = listOf(Color.White, Color(0xFFF8FFFE))
    )
    val GlowGradient = Brush.horizontalGradient(
        colors = listOf(TealLight.copy(alpha = 0.8f), TealMint.copy(alpha = 0.9f))
    )
    val CoralGradient = Brush.horizontalGradient(
        colors = listOf(Color(0xFFFF5252), FitnessCoral)
    )
}

// ==================== REUSABLE SKELETON SHIMMER ====================

@Composable
fun rememberShimmerBrush(): Brush {
    val shimmerColors = listOf(
        Color(0xFFE6F4F1).copy(alpha = 0.6f),
        Color(0xFFCCFBF1).copy(alpha = 0.9f),
        Color(0xFFE6F4F1).copy(alpha = 0.6f)
    )
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerTranslate"
    )
    return Brush.linearGradient(
        colors = shimmerColors,
        start = Offset.Zero,
        end = Offset(x = translateAnim, y = translateAnim)
    )
}

@Composable
fun ShimmerCoachCard() {
    val brush = rememberShimmerBrush()
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 2.dp, shape = RoundedCornerShape(20.dp), spotColor = WellnessTheme.TealBorder),
        border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorderLight)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(86.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(brush)
            )
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.6f)
                        .height(18.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(brush)
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .height(14.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(brush)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Box(modifier = Modifier.width(60.dp).height(22.dp).clip(RoundedCornerShape(12.dp)).background(brush))
                    Box(modifier = Modifier.width(80.dp).height(22.dp).clip(RoundedCornerShape(12.dp)).background(brush))
                }
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.5f)
                        .height(16.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(brush)
                )
            }
        }
    }
}

// ==================== BADGES & CHIPS ====================

@Composable
fun LiveAvailabilityPill(
    isAvailableToday: Boolean = true,
    nextSlot: String? = null
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (isAvailableToday) WellnessTheme.SuccessGreen.copy(alpha = 0.12f) else Color(0xFFF3F4F6),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isAvailableToday) WellnessTheme.SuccessGreen.copy(alpha = 0.3f) else Color(0xFFE5E7EB)
        )
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(if (isAvailableToday) WellnessTheme.SuccessGreen else Color.Gray)
            )
            Text(
                text = nextSlot ?: if (isAvailableToday) "Available Today" else "Next Slot Soon",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = if (isAvailableToday) Color(0xFF047857) else Color.Gray
            )
        }
    }
}

@Composable
fun TrustBadge(
    text: String,
    icon: ImageVector = Icons.Default.Verified,
    color: Color = WellnessTheme.TealDark
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = color.copy(alpha = 0.08f),
        border = androidx.compose.foundation.BorderStroke(0.8.dp, color.copy(alpha = 0.25f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(11.dp))
            Text(
                text = text,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                color = color
            )
        }
    }
}

@Composable
fun TealRatingBadge(rating: Double, reviewCount: Int? = null) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = Color(0xFFFFFBEB),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDE68A))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            Icon(Icons.Default.Star, contentDescription = null, tint = WellnessTheme.StarYellow, modifier = Modifier.size(12.dp))
            Text(
                text = String.format("%.1f", rating),
                fontSize = 11.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFFB45309)
            )
            if (reviewCount != null && reviewCount > 0) {
                Text(
                    text = "($reviewCount)",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF92400E)
                )
            }
        }
    }
}
