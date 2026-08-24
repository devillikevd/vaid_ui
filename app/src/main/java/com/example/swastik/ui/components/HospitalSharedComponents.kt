package com.example.swastik.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.data.model.*
import com.example.swastik.R
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikOrange
import com.example.swastik.utils.NavigationHelper
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.platform.LocalContext

// ═══════════════════════════════════════════════════════════════
//  COLOR CONSTANTS - Light Blue Theme (#E2F0FC)
// ═══════════════════════════════════════════════════════════════
private val CardLightBlue = Color(0xFFE2F0FC)
private val CardLightBlueDark = Color(0xFF1E3A5F)
private val AccentBlue = Color(0xFF2563EB)
private val AccentBlueLight = Color(0xFFDBEAFE)
private val AccentGreen = Color(0xFF059669)
private val AccentGreenLight = Color(0xFFD1FAE5)
private val AccentOrange = Color(0xFFF59E0B)
private val AccentOrangeLight = Color(0xFFFFF59D)
private val AccentRed = Color(0xFFDC2626)
private val AccentRedLight = Color(0xFFFEE2E2)
private val AccentPurple = Color(0xFF7C3AED)
private val AccentPurpleLight = Color(0xFFEDE9FE)
private val TextPrimary = Color(0xFF0F172A)
private val TextSecondary = Color(0xFF64748B)
private val TextTertiary = Color(0xFF94A3B8)
private val DividerColor = Color(0xFFE2E8F0)
private val SurfaceWhite = Color.White
private val SurfaceLight = Color(0xFFF8FAFC)

// Dark variants
private val CardDarkBlue = Color(0xFF1E3A5F)
private val TextPrimaryDark = Color(0xFFF1F5F9)
private val TextSecondaryDark = Color(0xFF94A3B8)
private val DividerDark = Color(0xFF334155)
private val SurfaceDark = Color(0xFF0F172A)
private val SurfaceVariantDark = Color(0xFF1E293B)

// ═══════════════════════════════════════════════════════════════
//  THEME-AWARE COLOR HELPERS
// ═══════════════════════════════════════════════════════════════
@Composable
private fun getCardColor(isDark: Boolean): Color = if (isDark) CardDarkBlue else CardLightBlue
@Composable
private fun getTextPrimary(isDark: Boolean): Color = if (isDark) TextPrimaryDark else TextPrimary
@Composable
private fun getTextSecondary(isDark: Boolean): Color = if (isDark) TextSecondaryDark else TextSecondary
@Composable
private fun getDividerColor(isDark: Boolean): Color = if (isDark) DividerDark else DividerColor
@Composable
private fun getSurfaceColor(isDark: Boolean): Color = if (isDark) SurfaceDark else SurfaceWhite
@Composable
private fun getAccentBlue(isDark: Boolean): Color = if (isDark) Color(0xFF60A5FA) else AccentBlue
@Composable
private fun getAccentBlueLight(isDark: Boolean): Color = if (isDark) Color(0xFF1E3A5F) else AccentBlueLight

// ═══════════════════════════════════════════════════════════════
//  1. FACILITY HERO CARD - Used in both Bottom Sheet & Detail Screen
// ═══════════════════════════════════════════════════════════════
@Composable
fun FacilityHeroCard(
    facility: MedicalFacility,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    showGalleryBadge: Boolean = true,
    showRatingBadge: Boolean = true,
    onImageClick: (() -> Unit)? = null
) {
    val cardColor = getCardColor(isDark)
    val textPrimary = getTextPrimary(isDark)
    val textSecondary = getTextSecondary(isDark)
    val accentBlue = getAccentBlue(isDark)
    val accentBlueLight = getAccentBlueLight(isDark)
    val accentGreen = if (isDark) Color(0xFF34D399) else AccentGreen
    val accentGreenLight = if (isDark) Color(0xFF064E3B) else AccentGreenLight
    val accentOrange = if (isDark) Color(0xFFFBBF24) else AccentOrange
    val accentOrangeLight = if (isDark) Color(0xFF78350F) else AccentOrangeLight
    val accentRed = if (isDark) Color(0xFFF87171) else AccentRed
    val accentRedLight = if (isDark) Color(0xFF7F1D1D) else AccentRedLight

    val headerImage = facility.imageUrl ?: facility.images.firstOrNull()

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        color = cardColor,
        shadowElevation = 2.dp
    ) {
        Box(modifier = Modifier
            .fillMaxWidth()
            .height(140.dp)
            .clip(RoundedCornerShape(16.dp))
        ) {
            if (headerImage != null) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(headerImage)
                        .crossfade(true)
                        .build(),
                    contentDescription = facility.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(16.dp))
                        .clickable(enabled = onImageClick != null) { onImageClick?.invoke() }
                )
                // Gradient overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.5f)
                                )
                            )
                        )
                        .clip(RoundedCornerShape(16.dp))
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(
                                    facility.type.getMarkerColor().copy(alpha = 0.3f),
                                    facility.type.getMarkerColor().copy(alpha = 0.1f)
                                )
                            )
                        )
                        .clip(RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = facility.type.getMarkerIcon(),
                        contentDescription = null,
                        tint = facility.type.getMarkerColor().copy(alpha = 0.6f),
                        modifier = Modifier.size(48.dp)
                    )
                }
            }

            // Bottom content
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp),
                verticalArrangement = Arrangement.Bottom,
                horizontalAlignment = Alignment.Start
            ) {
                // Type badge + Rating
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Type badge
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = facility.type.getMarkerColor().copy(alpha = 0.15f),
                        modifier = Modifier.padding(bottom = 8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = facility.type.getMarkerIcon(),
                                contentDescription = null,
                                tint = facility.type.getMarkerColor(),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = facility.type.getDisplayName(),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = facility.type.getMarkerColor()
                            )
                        }
                    }

                    // Rating badge
                    if (showRatingBadge && facility.rating > 0f) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color.White,
                            shadowElevation = 2.dp
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Star, contentDescription = null, tint = SwastikOrange, modifier = Modifier.size(13.dp))
                                Spacer(modifier = Modifier.width(2.dp))
                                Text("${facility.rating}", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = textPrimary)
                                Text(" (${facility.reviewCount})", fontSize = 10.sp, color = textSecondary)
                            }
                        }
                    }
                }

                // Gallery badge
                if (showGalleryBadge && facility.images.size > 1) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color.Black.copy(alpha = 0.6f),
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("${facility.images.size} Photos", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  2. QUICK ACTION ROW - 4 Actions Max (Call, Directions, WhatsApp, SOS/Book)
// ═══════════════════════════════════════════════════════════════
@Composable
fun QuickActionRow(
    facility: MedicalFacility,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    onCall: () -> Unit,
    onDirections: () -> Unit,
    onWhatsApp: () -> Unit,
    onPrimaryAction: () -> Unit,
    primaryActionLabel: String = "Book",
    primaryActionIcon: ImageVector = Icons.Default.CalendarMonth,
    primaryActionColor: Color = SwastikPrimary,
    showSOS: Boolean = false,
    onSOS: (() -> Unit)? = null,
    isSOSLoading: Boolean = false
) {
    val textPrimary = getTextPrimary(isDark)
    val context = LocalContext.current

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        QuickActionButton(
            icon = Icons.Default.Call,
            label = stringResource(R.string.call),
            color = AccentGreen,
            onClick = onCall
        )
        QuickActionButton(
            icon = Icons.Default.Directions,
            label = stringResource(R.string.directions),
            color = AccentBlue,
            onClick = onDirections
        )
        QuickActionButton(
            icon = Icons.Default.Chat,
            label = "WhatsApp",
            color = Color(0xFF25D366),
            onClick = onWhatsApp
        )
        if (showSOS && onSOS != null) {
            QuickActionButton(
                icon = Icons.Default.Warning,
                label = stringResource(R.string.sos_1),
                color = AccentRed,
                onClick = onSOS,
                isLoading = isSOSLoading
            )
        } else {
            QuickActionButton(
                icon = primaryActionIcon,
                label = primaryActionLabel,
                color = primaryActionColor,
                onClick = onPrimaryAction
            )
        }
    }
}

@Composable
private fun QuickActionButton(
    icon: ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit,
    isLoading: Boolean = false
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Surface(
            shape = CircleShape,
            color = color.copy(alpha = 0.12f),
            modifier = Modifier.size(52.dp)
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = color)
                } else {
                    Icon(icon, contentDescription = label, tint = color, modifier = Modifier.size(24.dp))
                }
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(label, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = color, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

// ═══════════════════════════════════════════════════════════════
//  3. TRUST BADGES - Emergency, Accreditations, ER Wait, Hours
// ═══════════════════════════════════════════════════════════════
@Composable
fun TrustBadgesRow(
    facility: MedicalFacility,
    modifier: Modifier = Modifier,
    isDark: Boolean
) {
    val accentBlue = getAccentBlue(isDark)
    val accentBlueLight = getAccentBlueLight(isDark)
    val accentGreen = if (isDark) Color(0xFF34D399) else AccentGreen
    val accentGreenLight = if (isDark) Color(0xFF064E3B) else AccentGreenLight
    val accentOrange = if (isDark) Color(0xFFFBBF24) else AccentOrange
    val accentOrangeLight = if (isDark) Color(0xFF78350F) else AccentOrangeLight
    val accentRed = if (isDark) Color(0xFFF87171) else AccentRed
    val accentRedLight = if (isDark) Color(0xFF7F1D1D) else AccentRedLight

    val badges = buildList {
        if (facility.isEmergencyAvailable) {
            add(TrustBadgeData(
                icon = Icons.Default.LocalHospital,
                label = stringResource(R.string.emergency),
                containerColor = accentRedLight,
                contentColor = accentRed
            ))
            facility.erWaitTimeMinutes?.let { waitTime ->
                add(TrustBadgeData(
                    icon = Icons.Default.AccessTimeFilled,
                    label = "ER Wait: ${waitTime}m",
                    containerColor = accentOrangeLight,
                    contentColor = accentOrange
                ))
            }
        }
        facility.accreditations.forEach { accreditation ->
            add(TrustBadgeData(
                icon = Icons.Default.Verified,
                label = accreditation,
                containerColor = accentBlueLight,
                contentColor = accentBlue
            ))
        }
        val timingsBadge = com.example.swastik.util.FacilityTimingsFormatter.getBadgeTimingsLabel(facility)
        timingsBadge?.takeIf { it.isNotBlank() }?.let { hoursLabel ->
            add(TrustBadgeData(
                icon = Icons.Default.AccessTime,
                label = hoursLabel,
                containerColor = if (isDark) Color(0xFF1E3A5F) else Color(0xFFDBEAFE),
                contentColor = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB)
            ))
        }
    }

    if (badges.isNotEmpty()) {
        LazyRow(
            modifier = modifier.padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(vertical = 8.dp)
        ) {
            items(badges) { badge ->
                TrustBadge(badge = badge, isDark = isDark)
            }
        }
    }
}

private data class TrustBadgeData(
    val icon: ImageVector,
    val label: String,
    val containerColor: Color,
    val contentColor: Color
)

@Composable
private fun TrustBadge(badge: TrustBadgeData, isDark: Boolean) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isDark) badge.containerColor.copy(alpha = 0.3f) else badge.containerColor
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(badge.icon, contentDescription = null, tint = badge.contentColor, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(badge.label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = badge.contentColor, maxLines = 1)
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  4. SECTION CARD - Consistent container for all sections
// ═══════════════════════════════════════════════════════════════
@Composable
fun SectionCard(
    title: String,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    showAction: Boolean = false,
    actionLabel: String = "",
    onActionClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val cardColor = getCardColor(isDark)
    val textPrimary = getTextPrimary(isDark)
    val textSecondary = getTextSecondary(isDark)
    val dividerColor = getDividerColor(isDark)
    val accentBlue = getAccentBlue(isDark)

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        shape = RoundedCornerShape(14.dp),
        color = cardColor,
        shadowElevation = 1.dp,
        border = BorderStroke(1.dp, dividerColor.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Title row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = textPrimary
                )
                if (showAction && onActionClick != null) {
                    Text(
                        text = actionLabel,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = accentBlue,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(onClick = onActionClick)
                            .padding(top = 4.dp, bottom = 4.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            content()
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  5. DOCTOR CARD - Shared between sheet & detail
// ═══════════════════════════════════════════════════════════════
@Composable
fun DoctorCard(
    doctor: HospitalDoctor,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    onBookClick: () -> Unit,
    onIntroClick: (() -> Unit)? = null,
    showIntroButton: Boolean = true,
    showRating: Boolean = true,
    showSlots: Boolean = false,
    contentPadding: PaddingValues = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
) {
    val cardColor = getCardColor(isDark)
    val textPrimary = getTextPrimary(isDark)
    val textSecondary = getTextSecondary(isDark)
    val accentBlue = getAccentBlue(isDark)
    val accentBlueLight = getAccentBlueLight(isDark)
    val dividerColor = getDividerColor(isDark)
    val context = LocalContext.current

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(contentPadding),
        shape = RoundedCornerShape(14.dp),
        color = cardColor,
        shadowElevation = 1.dp,
        border = BorderStroke(1.dp, dividerColor.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Doctor avatar
            if (doctor.profileImageUrl != null) {
                AsyncImage(
                    model = ImageRequest.Builder(context)
                        .data(doctor.profileImageUrl!!)
                        .crossfade(true)
                        .build(),
                    contentDescription = doctor.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(52.dp)
                        .clip(CircleShape)
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(accentBlueLight, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = doctor.imageEmoji, fontSize = 24.sp)
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Doctor info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = doctor.name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    color = textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = doctor.specialization,
                    fontSize = 13.sp,
                    color = textSecondary,
                    maxLines = 1
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (showRating && doctor.rating > 0f) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = SwastikOrange, modifier = Modifier.size(14.dp))
                        Text(" ${doctor.rating}", fontSize = 12.sp, color = textSecondary)
                        if (doctor.consultationFee > 0) {
                            Text(" • ₹${doctor.consultationFee}", fontSize = 12.sp, color = textSecondary)
                        }
                    } else if (doctor.consultationFee > 0) {
                        Text("₹${doctor.consultationFee}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = accentBlue)
                    }
                }
                if (showSlots && doctor.availableSlots.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(8.dp).background(AccentGreen, CircleShape))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Next: ${doctor.availableSlots.first()}", fontSize = 12.sp, color = AccentGreen, fontWeight = FontWeight.Medium)
                    }
                }
            }

            // Actions
            Column(horizontalAlignment = Alignment.End) {
                if (showIntroButton && !doctor.introVideoUrl.isNullOrBlank() && onIntroClick != null) {
                    OutlinedButton(
                        onClick = onIntroClick,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = accentBlue),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                        modifier = Modifier.padding(bottom = 6.dp).height(32.dp)
                    ) {
                        Icon(Icons.Default.PlayCircleOutline, contentDescription = "Play Intro", modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Intro", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Button(
                    onClick = onBookClick,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accentBlue),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text(text = stringResource(R.string.book), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  6. FACILITY CHIP - For departments, facilities, insurance, specializations
// ═══════════════════════════════════════════════════════════════
@Composable
fun FacilityChip(
    name: String,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    icon: ImageVector? = null,
    accentColor: Color = SwastikPrimary,
    accentBgColor: Color = Color(0xFFDBEAFE),
    onClick: (() -> Unit)? = null
) {
    val resolvedIcon = icon ?: resolveIconForName(name.lowercase())
    val resolvedAccentColor = if (isDark) Color(0xFF60A5FA) else accentColor
    val resolvedAccentBgColor = if (isDark) Color(0xFF1E3A5F) else accentBgColor

    Surface(
        modifier = modifier
            .clickable(enabled = onClick != null) { onClick?.invoke() }
            .padding(horizontal = 10.dp, vertical = 6.dp),
        shape = RoundedCornerShape(10.dp),
        color = resolvedAccentBgColor,
        border = BorderStroke(1.dp, resolvedAccentColor.copy(alpha = 0.3f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(resolvedIcon, contentDescription = null, tint = resolvedAccentColor, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(name, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = resolvedAccentColor)
        }
    }
}

private fun resolveIconForName(name: String): ImageVector {
    return when {
        name.contains("parking") -> Icons.Default.LocalParking
        name.contains("pharmacy") -> Icons.Default.LocalPharmacy
        name.contains("canteen") || name.contains("food") -> Icons.Default.Restaurant
        name.contains("wheelchair") || name.contains("access") -> Icons.Default.Accessible
        name.contains("icu") -> Icons.Default.MonitorHeart
        name.contains("nicu") -> Icons.Default.ChildCare
        name.contains("blood") -> Icons.Default.Bloodtype
        name.contains("ambulance") -> Icons.Default.LocalHospital
        name.contains("wifi") || name.contains("wi-fi") -> Icons.Default.Wifi
        name.contains("waiting") || name.contains("lounge") -> Icons.Default.Weekend
        name.contains("lab") -> Icons.Default.Science
        name.contains("x-ray") || name.contains("mri") || name.contains("ct scan") || name.contains("ultrasound") -> Icons.Default.CameraAlt
        name.contains("dialysis") -> Icons.Default.FilterAlt
        name.contains("operation") || name.contains("theatre") -> Icons.Default.MedicalServices
        name.contains("ventilator") || name.contains("oxygen") -> Icons.Default.Air
        name.contains("elevator") || name.contains("lift") -> Icons.Default.Elevator
        name.contains("insurance") -> Icons.Default.Shield
        else -> Icons.Default.CheckCircle
    }
}

// ═══════════════════════════════════════════════════════════════
//  7. INFO CARD - Two column info (Timings, Contact, etc.)
// ═══════════════════════════════════════════════════════════════
@Composable
fun InfoCard(
    icon: ImageVector,
    title: String,
    value: String,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    onClick: (() -> Unit)? = null
) {
    val cardColor = getCardColor(isDark)
    val textPrimary = getTextPrimary(isDark)
    val textSecondary = getTextSecondary(isDark)
    val dividerColor = getDividerColor(isDark)
    val accentBlue = getAccentBlue(isDark)

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(enabled = onClick != null) { onClick?.invoke() },
        shape = RoundedCornerShape(12.dp),
        color = cardColor,
        border = BorderStroke(1.dp, dividerColor.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = accentBlue, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 12.sp, color = textSecondary)
                Text(value, fontSize = 14.sp, color = textPrimary, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (onClick != null) {
                Icon(Icons.Default.ArrowForwardIos, contentDescription = null, tint = textSecondary, modifier = Modifier.size(16.dp))
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  8. ADDRESS CARD - Full address with directions button
// ═══════════════════════════════════════════════════════════════
@Composable
fun AddressCard(
    facility: MedicalFacility,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    onDirectionsClick: () -> Unit
) {
    val cardColor = getCardColor(isDark)
    val textPrimary = getTextPrimary(isDark)
    val textSecondary = getTextSecondary(isDark)
    val dividerColor = getDividerColor(isDark)
    val accentBlue = getAccentBlue(isDark)

    Surface(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(12.dp),
        color = cardColor,
        border = BorderStroke(1.dp, dividerColor.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Outlined.Place, contentDescription = null, tint = accentBlue)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(stringResource(R.string.address), fontSize = 12.sp, color = textSecondary)
                Text(facility.address, fontSize = 14.sp, color = textPrimary)
            }
            IconButton(onClick = onDirectionsClick) {
                Icon(Icons.Default.Directions, contentDescription = "Directions", tint = accentBlue, modifier = Modifier.size(24.dp))
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  9. EMERGENCY BADGE - 24/7 Emergency with ambulance
// ═══════════════════════════════════════════════════════════════
@Composable
fun EmergencyBadge(
    modifier: Modifier = Modifier,
    isDark: Boolean
) {
    val textPrimary = getTextPrimary(isDark)
    val textSecondary = getTextSecondary(isDark)
    val accentRed = if (isDark) Color(0xFFF87171) else AccentRed
    val accentRedLight = if (isDark) Color(0xFF7F1D1D) else AccentRedLight

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .background(accentRedLight.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.LocalHospital, contentDescription = null, tint = accentRed, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(stringResource(R.string.emergency_services_available), fontWeight = FontWeight.SemiBold, color = textPrimary, fontSize = 14.sp)
            Text(stringResource(R.string.str_247_emergency_care_with_ambulance), fontSize = 12.sp, color = textSecondary)
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  10. BED AVAILABILITY CARD - Progress bar with numbers
// ═══════════════════════════════════════════════════════════════
@Composable
fun BedAvailabilityCard(
    facility: MedicalFacility,
    modifier: Modifier = Modifier,
    isDark: Boolean
) {
    val cardColor = getCardColor(isDark)
    val textPrimary = getTextPrimary(isDark)
    val textSecondary = getTextSecondary(isDark)
    val dividerColor = getDividerColor(isDark)

    val available = facility.bedsAvailable ?: 0
    val total = facility.totalBeds ?: 0
    val progress = if (total > 0) available.toFloat() / total.toFloat() else 0f
    val progressColor = when {
        progress > 0.5f -> Color(0xFF22C55E)
        progress > 0.2f -> SwastikOrange
        else -> Color(0xFFEF4444)
    }

    Surface(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(14.dp),
        color = cardColor,
        shadowElevation = 1.dp,
        border = BorderStroke(1.dp, dividerColor.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = "$available", fontWeight = FontWeight.Bold, fontSize = 28.sp, color = progressColor)
                    Text(text = stringResource(R.string.beds_available_label), fontSize = 12.sp, color = textSecondary)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "$total", fontWeight = FontWeight.Bold, fontSize = 28.sp, color = textPrimary)
                    Text(text = stringResource(R.string.total_capacity), fontSize = 12.sp, color = textSecondary)
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { progress.coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                color = progressColor,
                trackColor = dividerColor
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  11. REELS SECTION - Horizontal scrolling video cards
// ═══════════════════════════════════════════════════════════════
@Composable
fun HospitalReelsSection(
    reels: List<HospitalReel>,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    sectionTitle: String = "Hospital Tour & Intro",
    onReelClick: (HospitalReel) -> Unit = {}
) {
    if (reels.isEmpty()) return

    val textPrimary = getTextPrimary(isDark)
    val cardColor = getCardColor(isDark)
    val dividerColor = getDividerColor(isDark)

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = sectionTitle,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = textPrimary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )
        androidx.compose.foundation.lazy.LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(reels) { reel ->
                ReelThumbnailCard(
                    reel = reel,
                    cardColor = cardColor,
                    dividerColor = dividerColor,
                    textPrimary = textPrimary,
                    isDark = isDark,
                    onClick = { onReelClick(reel) }
                )
            }
        }
    }
}

@Composable
private fun ReelThumbnailCard(
    reel: HospitalReel,
    cardColor: Color,
    dividerColor: Color,
    textPrimary: Color,
    isDark: Boolean,
    onClick: () -> Unit = {}
) {
    val context = LocalContext.current

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = cardColor,
        border = BorderStroke(1.dp, dividerColor.copy(alpha = 0.5f)),
        modifier = Modifier
            .width(140.dp)
            .height(200.dp)
            .clickable { onClick() }
    ) {
        Box(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp))) {
            // Thumbnail
            reel.thumbnailUrl?.let { thumbUrl ->
                coil.compose.AsyncImage(
                    model = coil.request.ImageRequest.Builder(context)
                        .data(thumbUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = reel.title ?: "Reel thumbnail",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } ?: Box(
                modifier = Modifier.fillMaxSize().background(Color.Gray.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Videocam, contentDescription = null, tint = textPrimary.copy(alpha = 0.5f), modifier = Modifier.size(48.dp))
            }

            // Play overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.3f))
                    .clip(RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.PlayCircle, contentDescription = "Play", tint = Color.White, modifier = Modifier.size(56.dp))
            }

            // Title overlay
            reel.title?.let { title ->
                Surface(
                    color = Color.Black.copy(alpha = 0.7f),
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(start = 8.dp, end = 8.dp, bottom = 8.dp)
                ) {
                    Text(text = title, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color.White, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(8.dp))
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  12. VIRTUAL TOUR / BOOK RIDE BUTTONS
// ═══════════════════════════════════════════════════════════════
@Composable
fun PremiumActionsRow(
    facility: MedicalFacility,
    modifier: Modifier = Modifier,
    isDark: Boolean
) {
    val context = LocalContext.current
    val textPrimary = getTextPrimary(isDark)
    val hasVirtualTour = !facility.virtualTourUrl.isNullOrBlank()

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (hasVirtualTour) {
            Button(
                onClick = {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(facility.virtualTourUrl!!))
                    context.startActivity(intent)
                },
                modifier = Modifier.weight(1f).height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Default.Explore, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Virtual Tour", fontWeight = FontWeight.Bold)
            }
        }

        OutlinedButton(
            onClick = {
                val geoUri = "geo:${facility.latitude},${facility.longitude}?q=${facility.latitude},${facility.longitude}(${Uri.encode(facility.name)})"
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(geoUri))
                intent.setPackage("com.ubercab")
                if (intent.resolveActivity(context.packageManager) != null) {
                    context.startActivity(intent)
                } else {
                    val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${facility.latitude}&dropoff[longitude]=${facility.longitude}&dropoff[nickname]=${Uri.encode(facility.name)}"))
                    context.startActivity(browserIntent)
                }
            },
            modifier = Modifier.weight(1f).height(56.dp),
            border = BorderStroke(1.dp, if (isDark) Color.White else Color.Black),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = if (isDark) Color.White else Color.Black),
            shape = RoundedCornerShape(14.dp)
        ) {
            Icon(Icons.Default.LocalTaxi, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Book Ride", fontWeight = FontWeight.Bold, color = if (isDark) Color.White else Color.Black)
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  13. MAP PREVIEW - OSM Map with marker
// ═══════════════════════════════════════════════════════════════
@Composable
fun MapPreviewCard(
    facility: MedicalFacility,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    onOpenDirections: () -> Unit
) {
    val cardColor = getCardColor(isDark)
    val textPrimary = getTextPrimary(isDark)
    val textSecondary = getTextSecondary(isDark)
    val dividerColor = getDividerColor(isDark)
    val accentBlue = getAccentBlue(isDark)

    if (facility.latitude == 0.0 && facility.longitude == 0.0) return

    Surface(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(14.dp),
        color = cardColor,
        shadowElevation = 1.dp,
        border = BorderStroke(1.dp, dividerColor.copy(alpha = 0.5f))
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // Address text
            Text(
                text = facility.address,
                fontSize = 13.sp,
                color = textSecondary,
                lineHeight = 18.sp,
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp)
            )

            // Map
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .border(1.dp, dividerColor, RoundedCornerShape(14.dp))
                    .padding(horizontal = 16.dp)
            ) {
                val iconRes = when (facility.type) {
                    FacilityType.HOSPITAL -> R.drawable.ic_map_hospital
                    FacilityType.CLINIC -> R.drawable.ic_map_clinic
                    FacilityType.MEDICAL_STORE -> R.drawable.ic_map_pharmacy
                    FacilityType.DIAGNOSTIC_CENTER -> R.drawable.ic_map_diagnostic
                    FacilityType.FITNESS_CENTER -> R.drawable.ic_map_hospital
                    FacilityType.NURSING_HOME -> R.drawable.ic_map_hospital
                }
                val color = when (facility.type) {
                    FacilityType.HOSPITAL -> android.graphics.Color.parseColor("#D32F2F")
                    FacilityType.CLINIC -> android.graphics.Color.parseColor("#4CAF50")
                    FacilityType.MEDICAL_STORE -> android.graphics.Color.parseColor("#2196F3")
                    FacilityType.DIAGNOSTIC_CENTER -> android.graphics.Color.parseColor("#7C3AED")
                    FacilityType.FITNESS_CENTER -> android.graphics.Color.parseColor("#0891B2")
                    FacilityType.NURSING_HOME -> android.graphics.Color.parseColor("#FF9800")
                }

                com.example.swastik.ui.components.OsmMapView(
                    center = org.osmdroid.util.GeoPoint(facility.latitude, facility.longitude),
                    zoom = 15.5,
                    markers = listOf(
                        com.example.swastik.ui.components.MapMarkerData(
                            id = facility.id,
                            latitude = facility.latitude,
                            longitude = facility.longitude,
                            title = facility.name,
                            snippet = facility.address,
                            markerColor = color,
                            iconRes = iconRes,
                            onClick = onOpenDirections
                        )
                    ),
                    modifier = Modifier.fillMaxSize()
                )

                // Open Directions overlay button
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = accentBlue.copy(alpha = 0.95f),
                    shadowElevation = 4.dp,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(10.dp)
                        .clickable(onClick = onOpenDirections)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Directions, contentDescription = null, tint = Color.White, modifier = Modifier.size(15.dp))
                        Text(text = "Open Directions", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  14. VIEW FULL DETAILS CTA - Primary button in bottom sheet
// ═══════════════════════════════════════════════════════════════
@Composable
fun ViewFullDetailsButton(
    modifier: Modifier = Modifier,
    isDark: Boolean,
    onClick: () -> Unit
) {
    val accentBlue = getAccentBlue(isDark)

    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp)
            .height(56.dp),
        colors = ButtonDefaults.buttonColors(containerColor = accentBlue),
        shape = RoundedCornerShape(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.ArrowForward, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("View Full Details", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
            Spacer(modifier = Modifier.width(4.dp))
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  15. SHIMMER SKELETON - For loading states
// ═══════════════════════════════════════════════════════════════
@Composable
fun HospitalDetailShimmerSkeleton(
    modifier: Modifier = Modifier,
    isDark: Boolean
) {
    val shimmerColor = if (isDark) Color.White.copy(alpha = 0.1f) else Color(0xFFE2E8F0)
    val baseColor = if (isDark) Color(0xFF1E293B) else Color.White

    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero shimmer
        Surface(
            modifier = Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            color = baseColor
        ) {
            Box(modifier = Modifier.fillMaxSize().background(shimmerColor.copy(alpha = 0.5f)))
        }
        // Name shimmer
        Surface(
            modifier = Modifier.fillMaxWidth(0.7f).height(28.dp).clip(RoundedCornerShape(8.dp)),
            shape = RoundedCornerShape(8.dp),
            color = baseColor
        ) {
            Box(modifier = Modifier.fillMaxSize().background(shimmerColor.copy(alpha = 0.5f)))
        }
        // Address shimmer
        Surface(
            modifier = Modifier.fillMaxWidth(0.5f).height(20.dp).clip(RoundedCornerShape(8.dp)),
            shape = RoundedCornerShape(8.dp),
            color = baseColor
        ) {
            Box(modifier = Modifier.fillMaxSize().background(shimmerColor.copy(alpha = 0.5f)))
        }
        // Section card shimmers
        repeat(4) {
            Surface(
                modifier = Modifier.fillMaxWidth().height(120.dp).clip(RoundedCornerShape(14.dp)),
                shape = RoundedCornerShape(14.dp),
                color = baseColor
            ) {
                Box(modifier = Modifier.fillMaxSize().background(shimmerColor.copy(alpha = 0.5f)))
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  16. EMPTY STATE - No doctors, no reviews, etc.
// ═══════════════════════════════════════════════════════════════
@Composable
fun EmptyStateView(
    icon: ImageVector,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    actionLabel: String = "",
    onActionClick: (() -> Unit)? = null
) {
    val textPrimary = getTextPrimary(isDark)
    val textSecondary = getTextSecondary(isDark)
    val accentBlue = getAccentBlue(isDark)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(icon, contentDescription = null, tint = textSecondary, modifier = Modifier.size(48.dp))
        Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = textPrimary, textAlign = TextAlign.Center)
        Text(subtitle, fontSize = 14.sp, color = textSecondary, textAlign = TextAlign.Center)
        if (actionLabel.isNotBlank() && onActionClick != null) {
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedButton(
                onClick = onActionClick,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = accentBlue),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
            ) {
                Text(actionLabel, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
