package com.example.swastik.ui.screens.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
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
import androidx.compose.ui.graphics.Color
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
    // 1. Heart animatables
    val heartScale = remember { Animatable(0.6f) }
    val heartAlpha = remember { Animatable(0f) }

    // 2. Plus icon animatables
    val plusScale = remember { Animatable(0.0f) }
    val plusAlpha = remember { Animatable(0f) }

    // 3. Text animatables
    val textAlpha = remember { Animatable(0f) }
    val textOffsetY = remember { Animatable(30f) }

    // 4. Welcome UI animatables
    val welcomeAlpha = remember { Animatable(0f) }
    val welcomeOffsetY = remember { Animatable(100f) }
    
    // Logo position (moves up when welcome screen appears)
    val logoOffsetY = remember { Animatable(0f) }
    val logoScale = remember { Animatable(1f) }

    LaunchedEffect(key1 = true) {
        // --- PHASE 1: Heart (0ms to 800ms) ---
        heartScale.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 800)
        )
    }
    LaunchedEffect(key1 = true) {
        heartAlpha.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 800)
        )
    }

    LaunchedEffect(key1 = true) {
        // --- PHASE 2: Plus Icon (Start at 600ms) ---
        delay(600)
        plusAlpha.snapTo(1f) // Make it visible
        // Zoom in to 1.5, then spring back to 1.0
        plusScale.animateTo(
            targetValue = 1.0f,
            animationSpec = spring(
                dampingRatio = androidx.compose.animation.core.Spring.DampingRatioMediumBouncy,
                stiffness = androidx.compose.animation.core.Spring.StiffnessLow
            )
        )
    }

    LaunchedEffect(key1 = true) {
        // --- PHASE 3: Text (Start at 1200ms) ---
        delay(1200)
        textAlpha.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 800)
        )
    }
    LaunchedEffect(key1 = true) {
        delay(1200)
        textOffsetY.animateTo(
            targetValue = 0f,
            animationSpec = tween(durationMillis = 800)
        )
    }

    LaunchedEffect(key1 = true) {
        // --- PHASE 4: Welcome UI Transition or Navigate (Start at 2400ms) ---
        delay(2400)
        
        if (isAuthenticated) {
            delay(400) // Wait till 2000ms
            onAutoNavigate()
        } else {
            // Move logo up smoothly and scale it down slightly
            logoOffsetY.animateTo(
                targetValue = -260f, // Move much higher
                animationSpec = tween(durationMillis = 800, easing = androidx.compose.animation.core.FastOutSlowInEasing)
            )
        }
    }
    
    LaunchedEffect(key1 = true) {
        if (!isAuthenticated) {
            delay(2400)
            logoScale.animateTo(
                targetValue = 0.85f, // Scale down to fit top space
                animationSpec = tween(durationMillis = 800, easing = androidx.compose.animation.core.FastOutSlowInEasing)
            )
        }
    }

    LaunchedEffect(key1 = true) {
        if (!isAuthenticated) {
            delay(2600) // Shortly after logo starts moving up
            welcomeAlpha.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 600)
            )
        }
    }
    
    LaunchedEffect(key1 = true) {
        if (!isAuthenticated) {
            delay(2600)
            welcomeOffsetY.animateTo(
                targetValue = 0f,
                animationSpec = tween(durationMillis = 600, easing = androidx.compose.animation.core.FastOutSlowInEasing)
            )
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFFFFFFF), // White at the top
                        Color(0xFFFFFFFF),
                        Color(0xFFE8F5E9), // Light green in the middle
                        Color(0xFFA5D6A7)  // Deeper green at the bottom
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        // Layer 1: Heart
        Image(
            painter = painterResource(id = R.drawable.vaididea_heart),
            contentDescription = "Vaididea Heart",
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .fillMaxSize(0.6f)
                .offset(y = logoOffsetY.value.dp)
                .scale(heartScale.value * logoScale.value)
                .alpha(heartAlpha.value)
        )

        // Layer 2: Plus
        Image(
            painter = painterResource(id = R.drawable.vaididea_plus),
            contentDescription = "Vaididea Plus",
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .fillMaxSize(0.6f)
                .offset(y = logoOffsetY.value.dp)
                .scale(plusScale.value * logoScale.value)
                .alpha(plusAlpha.value)
        )

        // Layer 3: Text
        Image(
            painter = painterResource(id = R.drawable.vaididea_text),
            contentDescription = "Vaididea Text",
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .fillMaxSize(0.6f)
                .offset(y = logoOffsetY.value.dp + textOffsetY.value.dp)
                .scale(logoScale.value)
                .alpha(textAlpha.value)
        )
        
        // Layer 4: Welcome Bottom Sheet
        if (welcomeAlpha.value > 0f) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.BottomCenter
            ) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.78f) // Take up bottom 78%
                        .offset(y = welcomeOffsetY.value.dp)
                        .alpha(welcomeAlpha.value),
                    shape = RoundedCornerShape(topStart = 40.dp, topEnd = 40.dp),
                    color = MaterialTheme.colorScheme.surface
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            stringResource(R.string.welcome),
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            stringResource(R.string.your_health_journey_starts_here),
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(48.dp))

                        // Get Started Button
                        Button(
                            onClick = onPatientRegisterClick,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(60.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 8.dp)
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
