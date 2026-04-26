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

// ==================== HEADER ====================

@Composable
fun ProfileHeader(onQrClick: () -> Unit, onSettingsClick: () -> Unit) {
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
            Text("My Profile", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                IconButton(onClick = onQrClick) {
                    Icon(Icons.Outlined.QrCode2, contentDescription = "QR", tint = Color.White)
                }
                IconButton(onClick = onSettingsClick) {
                    Icon(Icons.Outlined.Settings, contentDescription = "Settings", tint = Color.White)
                }
            }
        }
    }
}

// ==================== PROFILE INFO CARD ====================

@Composable
fun ProfileInfoCard(
    profile: PatientProfile?,
    onEditClick: () -> Unit,
    onShareClick: () -> Unit,
    onCameraClick: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
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
                                SwastikPurple.copy(alpha = 0.1f),
                                SwastikPurpleLight.copy(alpha = 0.05f)
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
                            .background(SwastikPurple.copy(alpha = 0.15f))
                            .border(3.dp, SwastikPurple, CircleShape),
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
                                color = SwastikPurple
                            )
                        }
                    }

                    if (profile?.isVerified == true) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(SwastikGreen)
                                .border(2.dp, colorScheme.surface, CircleShape)
                                .align(Alignment.BottomEnd),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Check, contentDescription = "Verified", tint = Color.White, modifier = Modifier.size(16.dp))
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
                    ProfileStat(profile?.displayAge ?: "--", "Age", "yrs")
                    VerticalDivider()
                    ProfileStat(profile?.displayBloodGroup ?: "--", "Blood", "Type")
                    VerticalDivider()
                    ProfileStat(profile?.displayWeight ?: "--", "Weight", "kg")
                    VerticalDivider()
                    ProfileStat(profile?.displayHeight ?: "--", "Height", "cm")
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
                        border = androidx.compose.foundation.BorderStroke(1.dp, SwastikPurple)
                    ) {
                        Icon(Icons.Outlined.Edit, contentDescription = null, modifier = Modifier.size(18.dp), tint = SwastikPurple)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Edit", color = SwastikPurple, fontSize = 13.sp)
                    }
                    Button(
                        onClick = onShareClick,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
                    ) {
                        Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Share", fontSize = 13.sp)
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
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SwastikPurple)
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
        "Add your name"
    } else when {
        profile.name.isEmpty() -> "Add your name"
        profile.age <= 0 -> "Add your age"
        profile.gender.isEmpty() -> "Set your gender"
        profile.bloodGroup.isEmpty() -> "Add blood group"
        profile.profileImageUrl.isEmpty() -> "Upload a profile photo"
        profile.emergencyContacts.isEmpty() -> "Add an emergency contact"
        else -> "Complete your profile"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SwastikPurple.copy(alpha = 0.06f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Profile Completion", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SwastikPurple)
                Text("${(percentage * 100).toInt()}%", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SwastikPurple)
            }
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { percentage },
                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                color = SwastikPurple,
                trackColor = SwastikPurple.copy(alpha = 0.15f),
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text("💡 Next step: $missingField", fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
        }
    }
}

// ==================== QUICK STATS ====================

@Composable
fun QuickStatsSection(stats: PatientStats) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        QuickStatCard(Icons.Outlined.CalendarMonth, stats.totalConsultations.toString(), "Consultations", SwastikPurple, Modifier.weight(1f))
        QuickStatCard(Icons.Outlined.Receipt, stats.totalPrescriptions.toString(), "Prescriptions", Color(0xFF4CAF50), Modifier.weight(1f))
        QuickStatCard(Icons.Outlined.Science, stats.totalReports.toString(), "Reports", Color(0xFF2196F3), Modifier.weight(1f))
    }
}

@Composable
private fun QuickStatCard(icon: ImageVector, value: String, label: String, color: Color, modifier: Modifier = Modifier) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f))
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = color)
            Text(label, fontSize = 10.sp, color = colorScheme.onSurfaceVariant)
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
fun HealthIdCard(profile: PatientProfile?) {
    val colorScheme = MaterialTheme.colorScheme
    val hasAbha = profile?.abhaNumber?.isNotEmpty() == true
    val accentColor = if (hasAbha) SwastikGreen else SwastikOrange
    val accentTextColor = if (hasAbha) colorScheme.onSecondaryContainer else colorScheme.onTertiaryContainer

    Card(
        modifier = Modifier.fillMaxWidth(),
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
                Text("ABHA Number", fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                Text(
                    if (hasAbha) profile?.abhaNumber ?: "" else "Not Linked",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = accentTextColor
                )
                Text(
                    if (hasAbha) "Linked: ${profile?.linkedHospitals ?: 0} hospitals" else "Tap to link your ABHA",
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
            SettingsMenuItem(Icons.Outlined.Person, "Personal Information", "Name, DOB, Gender", onClick = onPersonalInfoClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.LocationOn, "Saved Addresses", "Home, Office", onClick = onAddressesClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.FamilyRestroom, "Family Members", "Manage linked profiles", onClick = onFamilyClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.ContactEmergency, "Emergency Contacts", "Quick access in emergencies", onClick = onEmergencyClick)
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
        ThemePreference.LIGHT -> "Light Mode"
        ThemePreference.DARK -> "Dark Mode"
        ThemePreference.SYSTEM -> "System Default"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Column {
            SettingsMenuItem(Icons.Outlined.Notifications, "Notifications", "Manage alerts and reminders", onClick = onNotificationsClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Language, "Language", currentLang, onClick = onLanguageClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.DarkMode, "Appearance", currentTheme, onClick = onAppearanceClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Security, "Privacy & Security", "Password, Biometrics, 2FA", onClick = onPrivacyClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.CloudSync, "Data & Sync", "Auto-backup enabled", onClick = {})
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
            SettingsMenuItem(Icons.Outlined.Headphones, "24/7 Support", "Chat with us anytime", badgeText = "Online", badgeColor = SwastikGreen, onClick = onSupportClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.AutoMirrored.Outlined.HelpOutline, "Help Center", "FAQs & Tutorials", onClick = onHelpClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Feedback, "Send Feedback", "Help us improve", onClick = onFeedbackClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Description, "Terms of Service", "", onClick = onTermsClick)
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.PrivacyTip, "Privacy Policy", "", onClick = onPrivacyPolicyClick)
        }
    }
}

@Composable
fun SettingsMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    badgeText: String? = null,
    badgeColor: Color = SwastikPurple,
    onClick: () -> Unit = {}
) {
    val colorScheme = MaterialTheme.colorScheme
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
                .background(SwastikPurple.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = SwastikPurple, modifier = Modifier.size(22.dp))
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = colorScheme.onSurface)
            if (subtitle.isNotEmpty()) {
                Text(subtitle, fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
            }
        }

        if (badgeText != null) {
            Surface(color = badgeColor.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                Text(badgeText, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = badgeColor, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
            }
            Spacer(modifier = Modifier.width(8.dp))
        }

        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = colorScheme.onSurfaceVariant)
    }
}
