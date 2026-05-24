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
    onEditClick: () -> Unit,
    onShareClick: () -> Unit,
    onCameraClick: () -> Unit,
    onImageClick: (String) -> Unit = {}
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = modifier.fillMaxWidth(),
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
                Box {
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(CircleShape)
                            .background(colorScheme.primaryContainer)
                            .border(3.dp, colorScheme.primary, CircleShape)
                            .clickable { profile?.profileImageUrl?.let { if(it.isNotEmpty()) onImageClick(it) } },
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

                    if (profile?.isVerified == true) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary)
                                .border(2.dp, colorScheme.surface, CircleShape)
                                .align(Alignment.BottomEnd),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Check, contentDescription = "Verified", tint = MaterialTheme.colorScheme.surface, modifier = Modifier.size(16.dp))
                        }
                    }

                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(colorScheme.surface)
                            .border(1.dp, colorScheme.outline.copy(alpha = 0.45f), CircleShape)
                            .align(Alignment.TopEnd)
                            .clickable { onCameraClick() },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Outlined.CameraAlt,
                            contentDescription = "Change Photo",
                            tint = colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    profile?.name?.ifEmpty { "Add Your Name" } ?: "Add Your Name",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = colorScheme.onSurface
                )
                Text(profile?.phoneNumber ?: "", fontSize = 14.sp, color = colorScheme.onSurfaceVariant)
                if (profile?.email?.isNotEmpty() == true) {
                    Text(profile.email, fontSize = 13.sp, color = colorScheme.onSurfaceVariant)
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colorScheme.surfaceVariant.copy(alpha = 0.55f), RoundedCornerShape(12.dp))
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    ProfileStat(profile?.displayAge ?: "--", stringResource(R.string.age), "yrs")
                    VerticalDivider()
                    ProfileStat(profile?.displayBloodGroup ?: "--", stringResource(R.string.blood), stringResource(R.string.type_unit))
                    VerticalDivider()
                    ProfileStat(profile?.displayWeight ?: "--", stringResource(R.string.weight), "kg")
                    VerticalDivider()
                    ProfileStat(profile?.displayHeight ?: "--", stringResource(R.string.height), "cm")
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
        QuickStatCard(Icons.Outlined.Science, stats.totalReports.toString(), stringResource(R.string.reports), colorScheme.tertiaryContainer, colorScheme.onTertiaryContainer, colorScheme.tertiary, Modifier.weight(1f))
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
                .padding(vertical = 16.dp, horizontal = 4.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(iconColor.copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(24.dp))
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(value, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = contentColor)
                Text(
                    text = label, 
                    fontSize = 11.sp, 
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
    val accentColor = if (hasAbha) colorScheme.primary else colorScheme.tertiary
    val accentTextColor = if (hasAbha) colorScheme.onSecondaryContainer else colorScheme.onTertiaryContainer

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (hasAbha) {
                colorScheme.secondaryContainer.copy(alpha = 0.55f)
            } else {
                colorScheme.tertiaryContainer.copy(alpha = 0.55f)
            }
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(50.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        accentColor.copy(alpha = 0.18f)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (hasAbha) Icons.Outlined.Verified else Icons.Outlined.AddCard,
                    contentDescription = null,
                    tint = accentColor,
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(stringResource(R.string.abha_number), fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                Text(
                    if (hasAbha) profile?.abhaNumber ?: "" else stringResource(R.string.not_linked),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = accentTextColor
                )
                Text(
                    if (hasAbha) stringResource(R.string.linked_hospitals, profile?.linkedHospitals ?: 0) else stringResource(R.string.tap_to_link_abha),
                    fontSize = 11.sp,
                    color = accentColor
                )
            }

            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = accentColor
            )
        }
    }
}

// ==================== SETTINGS CARDS ====================

@Composable
fun SettingsCard(
    onPersonalInfoClick: () -> Unit,
    onAddressesClick: () -> Unit,
    onFamilyClick: () -> Unit,
    onEmergencyClick: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Column {
            SettingsMenuItem(Icons.Outlined.Person, stringResource(R.string.personal_info), stringResource(R.string.name_dob_gender), onClick = onPersonalInfoClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.LocationOn, stringResource(R.string.saved_addresses), stringResource(R.string.home_office), onClick = onAddressesClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.FamilyRestroom, stringResource(R.string.family_members), stringResource(R.string.manage_linked_profiles), onClick = onFamilyClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.ContactEmergency, stringResource(R.string.emergency_contacts), stringResource(R.string.quick_access_emergencies), onClick = onEmergencyClick)
        }
    }
}

@Composable
fun PreferencesCard(
    onNotificationsClick: () -> Unit,
    onLanguageClick: () -> Unit,
    onAppearanceClick: () -> Unit,
    onPrivacyClick: () -> Unit
) {
    val appSettings by AppSettingsStore.settings.collectAsState()
    val colorScheme = MaterialTheme.colorScheme
    val currentLang = appSettings.language
    val currentTheme = when (appSettings.themePreference) {
        ThemePreference.LIGHT -> stringResource(R.string.light_mode)
        ThemePreference.DARK -> stringResource(R.string.dark_mode)
        ThemePreference.SYSTEM -> stringResource(R.string.system_default)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Column {
            SettingsMenuItem(Icons.Outlined.Notifications, stringResource(R.string.notifications), stringResource(R.string.manage_alerts_reminders), onClick = onNotificationsClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Language, stringResource(R.string.language), stringResource(com.example.swastik.util.LanguageConfig.labelResId(currentLang)), onClick = onLanguageClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.DarkMode, stringResource(R.string.appearance), currentTheme, onClick = onAppearanceClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Security, stringResource(R.string.privacy_security), stringResource(R.string.password_biometrics_2fa), onClick = onPrivacyClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.CloudSync, stringResource(R.string.data_sync), stringResource(R.string.auto_backup_enabled), onClick = {})
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
            SettingsMenuItem(Icons.AutoMirrored.Outlined.HelpOutline, stringResource(R.string.help_center), stringResource(R.string.faqs_tutorials), onClick = onHelpClick)
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
