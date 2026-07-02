package com.example.swastik.ui.screens.auth

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ui.theme.SwastikGreen
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

@Composable
fun HomeScreen(
    onPatientRegisterClick: () -> Unit,
    onPatientLoginClick: () -> Unit
) {
    // Subtle animation for the logo
    val infiniteTransition = rememberInfiniteTransition(label = "logo")
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.6f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        SwastikPrimary,
                        SwastikPrimary.copy(alpha = 0.85f),
                        SwastikPrimaryLight.copy(alpha = 0.7f)
                    )
                )
            )
    ) {
        // Top Section with Swastik Logo
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(0.55f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Animated glow background
            Box(
                modifier = Modifier.size(160.dp),
                contentAlignment = Alignment.Center
            ) {
                // Glow effect
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .background(
                            Color.White.copy(alpha = glowAlpha * 0.3f),
                            CircleShape
                        )
                )

                // Main logo container
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.15f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    // Swastik Symbol - Auspicious Healthcare Symbol
                    SwastikSymbol(
                        modifier = Modifier.size(70.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // App Name with unique styling
            Text(
                text = stringResource(R.string.swastik_healthcare),
                fontSize = 20.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.9f),
                letterSpacing = 4.sp
            )

            Text(
                text = stringResource(R.string.swastik_healthcare),
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimary,
                letterSpacing = 8.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Tagline
            Surface(
                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.2f),
                shape = RoundedCornerShape(20.dp)
            ) {
                Text(
                    text = stringResource(R.string.healthcare_reimagined),
                    fontSize = 14.sp,
                    fontStyle = FontStyle.Italic,
                    color = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
                )
            }
        }

        // Bottom Section
        Surface(
            modifier = Modifier.fillMaxSize(),
            shape = RoundedCornerShape(topStart = 40.dp, topEnd = 40.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
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
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(SwastikPrimary.copy(alpha = 0.28f))
                    )
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

                Spacer(modifier = Modifier.height(32.dp))

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

                Spacer(modifier = Modifier.height(32.dp))

                // Features row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    FeatureItem(icon = "🏥", label = "Hospitals")
                    FeatureItem(icon = "👨‍⚕️", label = "Doctors")
                    FeatureItem(icon = "💊", label = "Medicines")
                    FeatureItem(icon = "📋", label = "Records")
                }

                Spacer(modifier = Modifier.height(24.dp))

                Spacer(modifier = Modifier.weight(1f))

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

@Composable
private fun SwastikSymbol(
    modifier: Modifier = Modifier,
    color: Color = Color.White
) {
    Canvas(modifier = modifier) {
        val strokeWidth = size.width * 0.12f
        val armLength = size.width * 0.35f
        val bendLength = size.width * 0.2f
        val center = Offset(size.width / 2, size.height / 2)

        // Draw the four arms of the Swastik
        // Horizontal line
        drawLine(
            color = color,
            start = Offset(center.x - armLength, center.y),
            end = Offset(center.x + armLength, center.y),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )

        // Vertical line
        drawLine(
            color = color,
            start = Offset(center.x, center.y - armLength),
            end = Offset(center.x, center.y + armLength),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )

        // Top arm bend (right)
        drawLine(
            color = color,
            start = Offset(center.x, center.y - armLength),
            end = Offset(center.x + bendLength, center.y - armLength),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )

        // Right arm bend (down)
        drawLine(
            color = color,
            start = Offset(center.x + armLength, center.y),
            end = Offset(center.x + armLength, center.y + bendLength),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )

        // Bottom arm bend (left)
        drawLine(
            color = color,
            start = Offset(center.x, center.y + armLength),
            end = Offset(center.x - bendLength, center.y + armLength),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )

        // Left arm bend (up)
        drawLine(
            color = color,
            start = Offset(center.x - armLength, center.y),
            end = Offset(center.x - armLength, center.y - bendLength),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )
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
