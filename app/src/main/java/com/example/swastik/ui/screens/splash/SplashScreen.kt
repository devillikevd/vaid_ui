package com.example.swastik.ui.screens.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.ui.theme.SwastikPrimary
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    isAuthenticated: Boolean = false,
    onAutoNavigate: () -> Unit = {},
    onPatientRegisterClick: () -> Unit = {},
    onPatientLoginClick: () -> Unit = {}
) {
    // 1. Unified Hero Logo Animatables (Apple / Spotify Style)
    val heroAlpha = remember { Animatable(0f) }
    val heroScale = remember { Animatable(0.85f) }
    val auraGlow = remember { Animatable(0f) }
    val shimmerTranslate = remember { Animatable(-1f) }

    // 2. Unified Elevation & Welcome Sheet
    val logoOffsetY = remember { Animatable(0f) }
    val logoScale = remember { Animatable(1f) }
    val welcomeAlpha = remember { Animatable(0f) }
    val welcomeOffsetY = remember { Animatable(120f) }

    // --- ORCHESTRATION ---
    // Stage 1: Unified Hero Emergence + Ambient Aura Glow (0ms - 500ms)
    LaunchedEffect(key1 = true) {
        heroAlpha.animateTo(1f, tween(400, easing = FastOutSlowInEasing))
    }
    LaunchedEffect(key1 = true) {
        heroScale.animateTo(1f, tween(500, easing = FastOutSlowInEasing))
    }
    LaunchedEffect(key1 = true) {
        auraGlow.animateTo(0.45f, tween(400, easing = FastOutSlowInEasing))
        auraGlow.animateTo(0.18f, tween(350, easing = FastOutSlowInEasing))
    }

    // Stage 2: Specular Shimmer Light Sweep (350ms - 850ms)
    LaunchedEffect(key1 = true) {
        delay(350)
        shimmerTranslate.animateTo(2f, tween(500, easing = FastOutSlowInEasing))
    }

    // Stage 3: Immediate Transition (880ms)
    LaunchedEffect(key1 = true) {
        delay(880)
        if (isAuthenticated) {
            onAutoNavigate()
        } else {
            logoOffsetY.animateTo(
                targetValue = -330f,
                animationSpec = tween(durationMillis = 480, easing = FastOutSlowInEasing)
            )
        }
    }

    LaunchedEffect(key1 = true) {
        if (!isAuthenticated) {
            delay(880)
            logoScale.animateTo(
                targetValue = 0.58f,
                animationSpec = tween(durationMillis = 480, easing = FastOutSlowInEasing)
            )
        }
    }

    LaunchedEffect(key1 = true) {
        if (!isAuthenticated) {
            delay(980)
            welcomeAlpha.animateTo(1f, tween(320))
        }
    }
    LaunchedEffect(key1 = true) {
        if (!isAuthenticated) {
            delay(980)
            welcomeOffsetY.animateTo(0f, tween(320, easing = FastOutSlowInEasing))
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFFFFFFF),
                        Color(0xFFFFFFFF),
                        Color(0xFFE8F5E9),
                        Color(0xFFA5D6A7)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        // --- UNIFIED HERO LOGO CONTAINER ---
        Box(
            modifier = Modifier
                .fillMaxSize(0.62f)
                .offset(y = logoOffsetY.value.dp)
                .scale(logoScale.value),
            contentAlignment = Alignment.Center
        ) {
            // Ambient Soft Aura Glow behind logo
            if (auraGlow.value > 0f) {
                Box(
                    modifier = Modifier
                        .size(240.dp)
                        .background(
                            brush = Brush.radialGradient(
                                colors = listOf(
                                    Color(0xFF86EFAC).copy(alpha = auraGlow.value),
                                    Color(0xFF10B981).copy(alpha = auraGlow.value * 0.4f),
                                    Color.Transparent
                                )
                            ),
                            shape = CircleShape
                        )
                )
            }

            // Complete Pristine Official Logo
            Image(
                painter = painterResource(id = R.drawable.vaididea_logo),
                contentDescription = "Vaididea Logo",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxSize()
                    .scale(heroScale.value)
                    .alpha(heroAlpha.value)
            )
        }

        // Layer 4: Welcome Bottom Sheet
        if (welcomeAlpha.value > 0f) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.BottomCenter
            ) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.72f) // Clean 72% height leaving ample top headroom
                        .offset(y = welcomeOffsetY.value.dp)
                        .alpha(welcomeAlpha.value),
                    shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                    color = MaterialTheme.colorScheme.surface
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 24.dp, vertical = 20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            stringResource(R.string.welcome),
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            stringResource(R.string.your_health_journey_starts_here),
                            fontSize = 14.5.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Get Started Button
                        Button(
                            onClick = onPatientRegisterClick,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(54.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.PersonAdd,
                                    contentDescription = null,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    stringResource(R.string.create_patient_account),
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        OutlinedButton(
                            onClick = onPatientLoginClick,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = SwastikPrimary),
                            border = androidx.compose.foundation.BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.28f))
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowForward,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    stringResource(R.string.login_as_patient),
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        // Professional Login Section
                        val context = androidx.compose.ui.platform.LocalContext.current
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.7f)
                            ),
                            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.secondary.copy(alpha = 0.3f))
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .background(MaterialTheme.colorScheme.surface, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.LocalHospital,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                                
                                Spacer(modifier = Modifier.width(16.dp))
                                
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        stringResource(R.string.are_you_a_doctor_hospital),
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSecondaryContainer
                                    )
                                    Text(
                                        stringResource(R.string.login_to_your_portal_on),
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.8f)
                                    )
                                    
                                    Spacer(modifier = Modifier.height(12.dp))
                                    
                                    OutlinedButton(
                                        onClick = {
                                            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://www.vaididea.in/"))
                                            context.startActivity(intent)
                                        },
                                        modifier = Modifier.height(36.dp),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.onSecondaryContainer)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Language, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSecondaryContainer)
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(stringResource(R.string.login_on_website), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer)
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Icon(Icons.Default.OpenInNew, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSecondaryContainer)
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.weight(1f))
                        
                        // Feature Icons
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            FeatureItem(icon = "🏥", label = "Hospitals")
                            FeatureItem(icon = "👨‍⚕️", label = "Doctors")
                            FeatureItem(icon = "💊", label = "Medicines")
                            FeatureItem(icon = "📋", label = "Records")
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Text(
                            stringResource(R.string.by_continuing_you_agree_to),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FeatureItem(icon: String, label: String) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(icon, fontSize = 28.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            label,
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Medium
        )
    }
}
