package com.example.swastik.ui.screens.patient.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import kotlin.math.cos
import kotlin.math.sin

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun FindDoctorsBySpecialitySection(
    onSpecialityClick: (String) -> Unit,
    showTitle: Boolean = true
) {
    // Page 0: General Care
    val generalSpecialities = listOf(
        Pair("General", R.drawable.generalphysician),
        Pair("Dentist", R.drawable.dentists),
        Pair("ENT", R.drawable.eatspecialist),
        Pair("Eye", R.drawable.eyespecialist),
        Pair("Skin", R.drawable.skinnspecialist),
        Pair("Child Care", R.drawable.childspecialist),
        Pair("Women's", R.drawable.womenhealth),
        Pair("Mental", R.drawable.mentalwelnness)
    )

    // Page 1: Advanced Care
    val advancedSpecialities = listOf(
        Pair("Heart", R.drawable.hearspecialist),
        Pair("Brain", R.drawable.brainnerve),
        Pair("Bones", R.drawable.bonesjoint),
        Pair("Stomach", R.drawable.stomatchdigestion),
        Pair("Urinary", R.drawable.urinanry),
        Pair("Diabetes", R.drawable.diabites),
        Pair("Cancer", R.drawable.cancer),
        Pair("Lungs", R.drawable.lungs)
    )

    // Mapping short names to exact backend strings
    val getFullName: (String) -> String = { shortName ->
        when (shortName) {
            "General" -> "General Physician"
            "ENT" -> "Ear, Nose & Throat"
            "Eye" -> "Eye Specialist"
            "Skin" -> "Skin Specialist"
            "Women's" -> "Women's Health"
            "Mental" -> "Mental Wellness"
            "Heart" -> "Heart Specialist"
            "Brain" -> "Brain & Nerves"
            "Bones" -> "Bones & Joints"
            "Stomach" -> "Stomach & Digestion"
            "Urinary" -> "Urinary Issues"
            "Diabetes" -> "Diabetes Management"
            "Cancer" -> "Cancer Specialist"
            "Lungs" -> "Lungs & Breathing"
            else -> shortName
        }
    }

    val pagerState = rememberPagerState(pageCount = { 2 })

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp)
            .background(Color.Transparent),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (showTitle) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.book_doctor_by_speciality),
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                // Page Indicator Text
                Text(
                    text = if (pagerState.currentPage == 0) "General Care 👉" else "👈 Advanced Care",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                    color = Color(0xFF0284C7)
                )
            }
        }

        // Radial Solar System Hub with Pager
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(380.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(Color.Transparent),
            contentAlignment = Alignment.Center
        ) {
            // Pulse Animation for central doctor (Stays fixed)
            val infiniteTransition = rememberInfiniteTransition(label = "pulse")
            val pulseScale by infiniteTransition.animateFloat(
                initialValue = 1f,
                targetValue = 1.15f,
                animationSpec = infiniteRepeatable(
                    animation = tween(1500, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "pulseScale"
            )
            val pulseAlpha by infiniteTransition.animateFloat(
                initialValue = 0.5f,
                targetValue = 0f,
                animationSpec = infiniteRepeatable(
                    animation = tween(1500, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "pulseAlpha"
            )

            val orbitRotationAngle by infiniteTransition.animateFloat(
                initialValue = 0f,
                targetValue = 360f,
                animationSpec = infiniteRepeatable(
                    animation = tween(30000, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart
                ),
                label = "orbitRotationAngle"
            )

            // Glowing background behind Doctor
            Box(
                modifier = Modifier
                    .size(160.dp)
                    .scale(pulseScale)
                    .clip(CircleShape)
                    .background(Color(0xFFBAE6FD).copy(alpha = pulseAlpha)) // Sky Blue glow
            )
            Box(
                modifier = Modifier
                    .size(130.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFE0F2FE))
            )

            // Central Doctor Image (Stays fixed while pager scrolls)
            Image(
                painter = painterResource(id = R.drawable.central_doctor), 
                contentDescription = "Central Doctor",
                modifier = Modifier
                    .size(140.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )

            // Horizontal Pager for Swiping Categories Orbit
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                val currentList = if (page == 0) generalSpecialities else advancedSpecialities
                
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    val radius = 135f // radius in dp
                    currentList.forEachIndexed { index, pair ->
                        // Start from -90 degrees (Top) and go clockwise, adding continuous rotation
                        val angleInDegrees = -90f + (index * (360f / currentList.size)) + orbitRotationAngle
                        val angleInRadians = angleInDegrees * (Math.PI / 180f)
                        
                        val offsetX = (cos(angleInRadians) * radius).dp
                        val offsetY = (sin(angleInRadians) * radius).dp

                        OrbitChip(
                            text = pair.first,
                            imageRes = pair.second,
                            onClick = { onSpecialityClick(getFullName(pair.first)) },
                            modifier = Modifier.offset(x = offsetX, y = offsetY)
                        )
                    }
                }
            }
        }
        
        // Custom Page Indicators
        Row(
            modifier = Modifier.padding(top = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            repeat(pagerState.pageCount) { iteration ->
                val color = if (pagerState.currentPage == iteration) Color(0xFF0F172A) else Color(0xFFCBD5E1)
                val width = if (pagerState.currentPage == iteration) 24.dp else 8.dp
                Box(
                    modifier = Modifier
                        .height(8.dp)
                        .width(width)
                        .clip(CircleShape)
                        .background(color)
                )
            }
        }
    }
}

@Composable
private fun OrbitChip(text: String, imageRes: Int, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .width(70.dp)
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Card(
            modifier = Modifier
                .size(54.dp),
            shape = RoundedCornerShape(12.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = text,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF1E293B),
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

// ---------------------------------------------------------
// Kept for backward compatibility with AllSpecialitiesScreen
// ---------------------------------------------------------
@Composable
fun SpecialityCard(
    name: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    bgColor: Color,
    iconTint: Color,
    imageRes: Int? = null,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(105.dp)
            .height(115.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(if (imageRes == null) bgColor.copy(alpha = 0.4f) else Color.Transparent),
                contentAlignment = Alignment.Center
            ) {
                if (imageRes != null) {
                    Image(
                        painter = painterResource(id = imageRes),
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Icon(
                        imageVector = icon,
                        contentDescription = name,
                        tint = iconTint,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }

            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(
                        androidx.compose.ui.graphics.Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                MaterialTheme.colorScheme.surface.copy(alpha = 0.7f),
                                MaterialTheme.colorScheme.surface
                            )
                        )
                    )
                    .padding(bottom = 8.dp, top = 24.dp, start = 4.dp, end = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = name,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    lineHeight = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
