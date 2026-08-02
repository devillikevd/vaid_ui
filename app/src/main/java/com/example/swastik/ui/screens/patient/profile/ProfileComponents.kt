package com.example.swastik.ui.screens.patient.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.data.local.ThemePreference
import com.example.swastik.data.model.*
import com.example.swastik.ui.theme.*
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

// ==================== HEADER ====================

@Composable
fun ProfileHeader(onSettingsClick: () -> Unit) {
    val colorScheme = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.linearGradient(colors = listOf(colorScheme.primary, colorScheme.primaryContainer)))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(stringResource(R.string.my_profile), fontSize = 22.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.surface)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                IconButton(onClick = onSettingsClick) {
                    Icon(Icons.Outlined.Settings, contentDescription = "Settings", tint = MaterialTheme.colorScheme.surface)
                }
            }
        }
    }
}

// ==================== PROFILE INFO CARD ====================

@Composable
fun ProfileInfoCard(
    modifier: Modifier = Modifier,
    profile: PatientProfile?,
    onCardClick: () -> Unit,
    onDpClick: () -> Unit,
    onEditClick: () -> Unit,
    onShareClick: () -> Unit,
    onCameraClick: () -> Unit,
    onImageClick: (String) -> Unit = {}
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onCardClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Box {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .background(
                        Brush.linearGradient(
                            colors = listOf(
                                colorScheme.primary.copy(alpha = 0.1f),
                                colorScheme.primaryContainer.copy(alpha = 0.3f)
                            )
                        )
                    )
            )

            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier.size(110.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        progress = { profile?.completionPercentage ?: 0f },
                        modifier = Modifier.fillMaxSize(),
                        color = colorScheme.primary,
                        strokeWidth = 4.dp,
                        trackColor = colorScheme.surfaceVariant
                    )
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(CircleShape)
                            .background(colorScheme.primaryContainer)
                            .clickable { onDpClick() },
                        contentAlignment = Alignment.Center
                    ) {
                        if (profile?.profileImageUrl?.isNotEmpty() == true) {
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data(profile.profileImageUrl)
                                    .crossfade(true)
                                    .size(180)
                                    .build(),
                                contentDescription = "Profile Photo",
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Text(
                                profile?.initials?.ifEmpty { "?" } ?: "?",
                                fontSize = if (profile?.initials?.isNotEmpty() == true) 32.sp else 45.sp,
                                fontWeight = FontWeight.Bold,
                                color = colorScheme.primary
                            )
                        }
                    }

                    // Percentage Badge
                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .offset(y = 10.dp),
                        color = colorScheme.primary,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = "${((profile?.completionPercentage ?: 0f) * 100).toInt()}%",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = colorScheme.onPrimary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        profile?.name?.ifEmpty { "Add Your Name" } ?: "Add Your Name",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = colorScheme.onSurface
                    )
                    
                    if (profile?.isVerified == true) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(
                            Icons.Default.CheckCircle, 
                            contentDescription = "Verified", 
                            tint = colorScheme.primary, 
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                val pct = ((profile?.completionPercentage ?: 0f) * 100).toInt()
                if (pct < 100) {
                    // Find first missing field to guide the user
                    val nextStep = when {
                        profile?.name.isNullOrEmpty() -> "Add your name"
                        profile?.email.isNullOrEmpty() -> "Add email address"
                        (profile?.age ?: 0) <= 0 -> "Add your date of birth"
                        profile?.gender.isNullOrEmpty() -> "Add your gender"
                        profile?.bloodGroup.isNullOrEmpty() -> "Add blood group"
                        (profile?.weight ?: 0f) <= 0f -> "Add your weight"
                        (profile?.height ?: 0f) <= 0f -> "Add your height"
                        profile?.location.isNullOrEmpty() -> "Add your location"
                        profile?.profileImageUrl.isNullOrEmpty() -> "Add a profile photo"
                        profile?.emergencyContacts.isNullOrEmpty() -> "Add emergency contact"
                        else -> null
                    }
                    if (nextStep != null) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                Icons.Outlined.Info,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = colorScheme.error.copy(alpha = 0.75f)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "Profile incomplete • $nextStep",
                                fontSize = 11.sp,
                                color = colorScheme.error.copy(alpha = 0.75f),
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onEditClick,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colorScheme.primary)
                    ) {
                        Icon(Icons.Outlined.Edit, contentDescription = null, modifier = Modifier.size(18.dp), tint = colorScheme.primary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(stringResource(R.string.edit), color = colorScheme.primary, fontSize = 13.sp)
                    }
                    Button(
                        onClick = onShareClick,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = colorScheme.primary, contentColor = colorScheme.onPrimary)
                    ) {
                        Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(stringResource(R.string.share), fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileStat(value: String, label: String, unit: String) {
    val colorScheme = MaterialTheme.colorScheme
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = colorScheme.primary)
            if (unit != "Type") {
                Text(
                    unit,
                    fontSize = 10.sp,
                    color = colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 2.dp, start = 2.dp)
                )
            }
        }
        Text(label, fontSize = 11.sp, color = colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun VerticalDivider() {
    val colorScheme = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .width(1.dp)
            .height(36.dp)
            .background(colorScheme.outline.copy(alpha = 0.35f))
    )
}

// ==================== PROFILE COMPLETION ====================

@Composable
fun ProfileCompletionCard(profile: PatientProfile?) {
    val colorScheme = MaterialTheme.colorScheme
    val completedFields = listOf(
        profile?.name?.isNotEmpty() == true,
        (profile?.age ?: 0) > 0,
        profile?.gender?.isNotEmpty() == true,
        profile?.bloodGroup?.isNotEmpty() == true,
        (profile?.weight ?: 0f) > 0f,
        (profile?.height ?: 0f) > 0f,
        profile?.location?.isNotEmpty() == true,
        profile?.profileImageUrl?.isNotEmpty() == true,
        profile?.emergencyContacts?.isNotEmpty() == true,
        profile?.email?.isNotEmpty() == true
    )
    val filled = completedFields.count { it }
    val total = completedFields.size
    val percentage = filled.toFloat() / total

    if (percentage >= 1f) return

    val missingField = if (profile == null) {
        stringResource(R.string.add_your_name)
    } else when {
        profile.name.isEmpty() -> stringResource(R.string.add_your_name)
        profile.age <= 0 -> stringResource(R.string.add_your_age)
        profile.gender.isEmpty() -> stringResource(R.string.set_your_gender)
        profile.bloodGroup.isEmpty() -> stringResource(R.string.add_blood_group)
        profile.profileImageUrl.isEmpty() -> stringResource(R.string.upload_profile_photo)
        profile.emergencyContacts.isEmpty() -> stringResource(R.string.add_emergency_contact_step)
        else -> stringResource(R.string.complete_your_profile)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.primaryContainer)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(stringResource(R.string.profile_completion), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = colorScheme.onPrimaryContainer)
                Text("${(percentage * 100).toInt()}%", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = colorScheme.onPrimaryContainer)
            }
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { percentage },
                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                color = colorScheme.primary,
                trackColor = colorScheme.onPrimaryContainer.copy(alpha = 0.15f),
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(stringResource(R.string.next_step, missingField), fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
        }
    }
}

// ==================== QUICK STATS ====================

@Composable
fun QuickStatsSection(stats: PatientStats) {
    val colorScheme = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        QuickStatCard(Icons.Outlined.CalendarMonth, stats.totalConsultations.toString(), stringResource(R.string.consultations), colorScheme.primaryContainer, colorScheme.onPrimaryContainer, colorScheme.primary, Modifier.weight(1f))
        QuickStatCard(Icons.Outlined.Receipt, stats.totalPrescriptions.toString(), stringResource(R.string.prescriptions), colorScheme.secondaryContainer, colorScheme.onSecondaryContainer, colorScheme.secondary, Modifier.weight(1f))
        QuickStatCard(
            Icons.Outlined.Description, 
            stats.totalReports.toString(), 
            stringResource(R.string.reports), 
            Color(0xFFE1F5FE), // Light Sky Blue Container
            Color(0xFF01579B), // Dark Blue Content
            Color(0xFF0288D1), // Medium Blue Icon
            Modifier.weight(1f)
        )
    }
}

@Composable
private fun QuickStatCard(icon: ImageVector, value: String, label: String, containerColor: Color, contentColor: Color, iconColor: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor.copy(alpha = 0.55f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 4.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(iconColor.copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(18.dp))
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(value, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = contentColor)
                Text(
                    text = label, 
                    fontSize = 10.sp, 
                    color = contentColor.copy(alpha = 0.9f), 
                    fontWeight = FontWeight.Medium,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
        }
    }
}

// ==================== SECTION TITLE WITH BADGE ====================

@Composable
fun SectionTitleWithBadge(title: String, badge: String, badgeColor: Color) {
    val colorScheme = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = colorScheme.onSurface)
        Surface(color = badgeColor.copy(alpha = 0.15f), shape = RoundedCornerShape(6.dp)) {
            Text(badge, fontSize = 11.sp, color = badgeColor, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
        }
    }
}

// ==================== HEALTH ID CARD ====================

@Composable
fun HealthIdCard(profile: PatientProfile?, onClick: () -> Unit = {}) {
    val colorScheme = MaterialTheme.colorScheme
    val hasAbha = profile?.abhaNumber?.isNotEmpty() == true

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(50.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (hasAbha) Icons.Outlined.Verified else Icons.Outlined.AddCard,
                    contentDescription = null,
                    tint = colorScheme.primary,
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(stringResource(R.string.abha_number), fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                Text(
                    if (hasAbha) {
                        val abha = profile?.abhaNumber ?: ""
                        val d = abha.replace(Regex("[^0-9]"), "")
                        if (d.length == 14) {
                            "${d.substring(0, 2)}-${d.substring(2, 6)}-${d.substring(6, 10)}-${d.substring(10, 14)}"
                        } else abha
                    } else stringResource(R.string.not_linked),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = colorScheme.onSurface,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
                Text(
                    if (hasAbha) stringResource(R.string.linked_hospitals, profile?.linkedHospitals ?: 0) else stringResource(R.string.tap_to_link_abha),
                    fontSize = 11.sp,
                    color = colorScheme.primary
                )
            }

            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = colorScheme.primary
            )
        }
    }
}

// ==================== SETTINGS CARDS ====================

@Composable
fun SettingsCard(
    onAddressesClick: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Column {
            SettingsMenuItem(Icons.Outlined.LocationOn, stringResource(R.string.saved_addresses), stringResource(R.string.home_office), onClick = onAddressesClick)
        }
    }
}

@Composable
fun PreferencesCard(
    onNotificationsClick: () -> Unit,
    onLanguageClick: () -> Unit,
    onGuardianClick: () -> Unit
) {
    val appSettings by AppSettingsStore.settings.collectAsState()
    val colorScheme = MaterialTheme.colorScheme
    val currentLang = appSettings.language

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Column {
            SettingsMenuItem(Icons.Outlined.Notifications, stringResource(R.string.notifications), stringResource(R.string.manage_alerts_reminders), onClick = onNotificationsClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Security, "Guardian Settings", "Fall detection & SOS", onClick = onGuardianClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Language, stringResource(R.string.language), stringResource(com.example.swastik.util.LanguageConfig.labelResId(currentLang)), onClick = onLanguageClick)
        }
    }
}

@Composable
fun SupportCard(
    onSupportClick: () -> Unit,
    onHelpClick: () -> Unit,
    onFeedbackClick: () -> Unit,
    onTermsClick: () -> Unit,
    onPrivacyPolicyClick: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Column {
            SettingsMenuItem(Icons.Outlined.Headphones, stringResource(R.string.support_24_7), stringResource(R.string.chat_with_us_anytime), badgeText = stringResource(R.string.online), badgeColor = colorScheme.primary, onClick = onSupportClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.AutoMirrored.Outlined.HelpOutline, "FAQ", "Frequently Asked Questions", onClick = onHelpClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Feedback, stringResource(R.string.send_feedback), stringResource(R.string.help_us_improve), onClick = onFeedbackClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Description, stringResource(R.string.terms_of_service), "", onClick = onTermsClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.PrivacyTip, stringResource(R.string.privacy_policy), "", onClick = onPrivacyPolicyClick)
        }
    }
}

@Composable
fun SettingsMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    badgeText: String? = null,
    badgeColor: Color? = null,
    onClick: () -> Unit = {}
) {
    val colorScheme = MaterialTheme.colorScheme
    val resolvedBadgeColor = badgeColor ?: colorScheme.primary
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = colorScheme.primary, modifier = Modifier.size(22.dp))
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = colorScheme.onSurface)
            if (subtitle.isNotEmpty()) {
                Text(subtitle, fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
            }
        }

        if (badgeText != null) {
            Surface(color = resolvedBadgeColor.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                Text(badgeText, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = resolvedBadgeColor, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
            }
            Spacer(modifier = Modifier.width(8.dp))
        }

        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = colorScheme.onSurfaceVariant)
    }
}
