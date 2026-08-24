package com.example.swastik.ui.screens.patient.components

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalPharmacy
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.swastik.data.model.DiagnosticCenter
import com.example.swastik.data.model.HospitalReel
import com.example.swastik.data.model.Pharmacy
import com.example.swastik.ui.components.SectionCard

@Composable
fun HospitalReelsSection(reels: List<HospitalReel>, isDark: Boolean) {
    if (reels.isEmpty()) return
    
    var activeReel by remember { mutableStateOf<HospitalReel?>(null) }
    val textColor = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A)

    activeReel?.let { reel ->
        com.example.swastik.ui.components.FacilityReelPlayerDialog(
            videoUrl = reel.videoUrl,
            title = reel.title ?: "Hospital Tour",
            onDismiss = { activeReel = null }
        )
    }

    SectionCard(title = "Hospital Reels & Tours", isDark = isDark) {
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(end = 16.dp)
        ) {
            items(reels) { reel ->
                Box(
                    modifier = Modifier
                        .width(140.dp)
                        .height(220.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable {
                            if (reel.videoUrl.isNotEmpty()) {
                                activeReel = reel
                            }
                        }
                ) {
                    AsyncImage(
                        model = com.example.swastik.util.MediaUrlResolver.resolve(reel.thumbnailUrl ?: reel.videoUrl),
                        contentDescription = reel.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    
                    // Gradient Overlay
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))))
                    )
                    
                    // Play Button
                    Surface(
                        shape = CircleShape,
                        color = Color.White.copy(alpha = 0.3f),
                        modifier = Modifier.size(40.dp).align(Alignment.Center)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = Color.White, modifier = Modifier.padding(8.dp))
                    }
                    
                    // Text
                    Column(
                        modifier = Modifier.align(Alignment.BottomStart).padding(8.dp)
                    ) {
                        Text(
                            text = reel.title ?: "Tour",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Virtual Tour",
                            color = Color.LightGray,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AssociatedNetworkSection(
    pharmacies: List<Pharmacy>?,
    diagnostics: List<DiagnosticCenter>?,
    isDark: Boolean
) {
    if (pharmacies.isNullOrEmpty() && diagnostics.isNullOrEmpty()) return

    val bgColor = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9)
    val textColor = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A)
    val subtitleColor = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)

    SectionCard(title = "Associated Network", isDark = isDark) {
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(end = 16.dp)
        ) {
            // Pharmacies
            pharmacies?.let { list ->
                items(list) { pharmacy ->
                    NetworkCard(
                        title = pharmacy.name,
                        subtitle = "Pharmacy",
                        icon = Icons.Default.LocalPharmacy,
                        iconTint = Color(0xFF10B981),
                        bgColor = bgColor,
                        textColor = textColor,
                        subtitleColor = subtitleColor
                    )
                }
            }
            
            // Diagnostics
            diagnostics?.let { list ->
                items(list) { center ->
                    NetworkCard(
                        title = center.name,
                        subtitle = "Diagnostic Center",
                        icon = Icons.Default.Science,
                        iconTint = Color(0xFF8B5CF6),
                        bgColor = bgColor,
                        textColor = textColor,
                        subtitleColor = subtitleColor
                    )
                }
            }
        }
    }
}

@Composable
private fun NetworkCard(title: String, subtitle: String, icon: androidx.compose.ui.graphics.vector.ImageVector, iconTint: Color, bgColor: Color, textColor: Color, subtitleColor: Color) {
    Surface(
        color = bgColor,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.width(160.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = title, color = textColor, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(text = subtitle, color = subtitleColor, fontSize = 12.sp)
        }
    }
}

@Composable
fun HealthAlertCard(isDark: Boolean, modifier: Modifier = Modifier) {
    // This is a static UI component representing the Outbreak Intelligence module.
    // In production, this would be wired to the Outbreak API.
    val bgColor = if (isDark) Color(0xFF450A0A) else Color(0xFFFEF2F2) // Light red
    val borderColor = if (isDark) Color(0xFF7F1D1D) else Color(0xFFFECACA)
    val textColorPrimary = if (isDark) Color(0xFFFECACA) else Color(0xFF991B1B)
    val textColorSecondary = if (isDark) Color(0xFFFCA5A5) else Color(0xFFB91C1C)
    
    Card(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        border = BorderStroke(1.dp, borderColor)
    ) {
        Box(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, contentDescription = "Alert", tint = textColorPrimary, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("HEALTH INTELLIGENCE ALERT", color = textColorPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 1.sp)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text("High Severity Dengue Outbreak within 5km", color = textColorPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text("Immediate Action Required. 45 Affected Patients.", color = textColorSecondary, fontSize = 13.sp)
            }
        }
    }
}
