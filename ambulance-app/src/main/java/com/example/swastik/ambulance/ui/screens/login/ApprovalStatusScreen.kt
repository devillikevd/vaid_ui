package com.example.swastik.ambulance.ui.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ambulance.data.remote.dto.UserDto

private data class ApprovalPresentation(
    val title: String,
    val subtitle: String,
    val helperText: String,
    val icon: ImageVector,
    val accentColor: Color,
    val surfaceTint: Color
)

@Composable
fun ApprovalStatusScreen(
    user: UserDto?,
    isRefreshing: Boolean,
    errorMessage: String?,
    onRefresh: () -> Unit,
    onLogout: () -> Unit
) {
    val presentation = remember(user?.approvalStatus) {
        when (user?.approvalStatus?.lowercase()) {
            "approved" -> ApprovalPresentation(
                title = "Dispatch access approved",
                subtitle = "Your operator account is active.",
                helperText = "You can continue to your live dashboard now.",
                icon = Icons.Default.CheckCircle,
                accentColor = Color(0xFF1B8A3C),
                surfaceTint = Color(0xFFE5F6EA)
            )

            "rejected" -> ApprovalPresentation(
                title = "Registration needs changes",
                subtitle = "Admin review rejected this operator account.",
                helperText = "Review the note below, update the details if needed, and contact admin support before trying again.",
                icon = Icons.Default.Warning,
                accentColor = Color(0xFFC15A00),
                surfaceTint = Color(0xFFFFF1E0)
            )

            "suspended" -> ApprovalPresentation(
                title = "Operator access is suspended",
                subtitle = "Dispatch actions are paused for this account.",
                helperText = "Please contact the admin team before attempting to handle emergencies from this device.",
                icon = Icons.Default.Block,
                accentColor = Color(0xFFB3261E),
                surfaceTint = Color(0xFFFDECEA)
            )

            "under_review", "review" -> ApprovalPresentation(
                title = "Registration under review",
                subtitle = "Your documents are being checked by the admin team.",
                helperText = "We will unlock dispatch access after the verification review is complete.",
                icon = Icons.Default.AccessTime,
                accentColor = Color(0xFF8C3D00),
                surfaceTint = Color(0xFFFFF3E0)
            )

            else -> ApprovalPresentation(
                title = "Waiting for admin approval",
                subtitle = "Your operator account is created, but dispatch access is still locked.",
                helperText = "Email verification is required first, and the admin team must approve your operator profile before the app can go live.",
                icon = Icons.Default.AccessTime,
                accentColor = Color(0xFF9A3412),
                surfaceTint = Color(0xFFFFEDE5)
            )
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF1B0B0B),
                        Color(0xFF621212),
                        Color(0xFF991B1B)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 22.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "SWASTIK Ambulance",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )

            Text(
                text = "Operator onboarding",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.78f)
            )

            Spacer(modifier = Modifier.height(28.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(
                    modifier = Modifier.padding(22.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(presentation.surfaceTint)
                            .padding(18.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = presentation.icon,
                            contentDescription = null,
                            tint = presentation.accentColor
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    Text(
                        text = presentation.title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = presentation.subtitle,
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = presentation.surfaceTint,
                        tonalElevation = 0.dp
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = user?.companyName ?: user?.name ?: "Ambulance operator",
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = user?.email ?: "Account email unavailable",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            StatusPill(
                                label = (user?.approvalStatus ?: "pending")
                                    .replace("_", " ")
                                    .replaceFirstChar { it.uppercase() },
                                accentColor = presentation.accentColor
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    Text(
                        text = presentation.helperText,
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    if (!user?.approvalNotes.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(18.dp))
                        Card(
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F8F8))
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Admin note",
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = user?.approvalNotes.orEmpty(),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    if (!errorMessage.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(18.dp))
                        Card(
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFDECEA))
                        ) {
                            Text(
                                text = errorMessage,
                                modifier = Modifier.padding(16.dp),
                                color = Color(0xFFB3261E),
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = onRefresh,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F)),
                        enabled = !isRefreshing
                    ) {
                        if (isRefreshing) {
                            CircularProgressIndicator(
                                modifier = Modifier.height(22.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null)
                                Text("Refresh approval status", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedButton(
                        onClick = onLogout,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
                            Text("Sign out")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusPill(label: String, accentColor: Color) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = accentColor.copy(alpha = 0.12f)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            color = accentColor,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold
        )
    }
}
