package com.example.swastik.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Work
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.data.model.Doctor
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DoctorProfileBottomSheet(
    doctor: Doctor,
    onDismiss: () -> Unit,
    onBookClick: () -> Unit
) {
    val scrollState = rememberScrollState()
    val qualificationText = doctor.qualification?.takeIf { it.isNotBlank() }
        ?: doctor.qualifications?.filter { it.isNotBlank() }?.joinToString(", ")?.takeIf { it.isNotBlank() }
        ?: "Qualification not listed"
    val languagesText = doctor.languages?.filter { it.isNotBlank() }?.joinToString(", ")?.takeIf { it.isNotBlank() }
    val ratingValue = doctor.averageRating?.takeIf { it > 0f }
    val reviewCount = doctor.totalReviews?.takeIf { it > 0 }
    val bioText = doctor.bio?.takeIf { it.isNotBlank() } ?: "Profile summary has not been added yet."

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surface,
        scrimColor = Color.Black.copy(alpha = 0.3f),
        dragHandle = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(scrollState)
                .padding(bottom = 32.dp)
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .graphicsLayer {
                        translationY = scrollState.value * 0.4f
                        alpha = 1f - (scrollState.value / 300f).coerceIn(0f, 1f)
                    },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(88.dp)
                        .background(SwastikPrimaryLight, RoundedCornerShape(24.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    if (!doctor.profileImageUrl.isNullOrBlank()) {
                        coil.compose.AsyncImage(
                            model = doctor.profileImageUrl,
                            contentDescription = "Doctor Profile",
                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(24.dp)),
                            contentScale = androidx.compose.ui.layout.ContentScale.Crop
                        )
                    } else {
                        Text(stringResource(R.string.string_2), fontSize = 48.sp)
                    }
                    Icon(
                        Icons.Filled.CheckCircle,
                        contentDescription = "Verified",
                        tint = SwastikPrimary,
                        modifier = Modifier
                            .size(24.dp)
                            .align(Alignment.BottomEnd)
                            .offset(x = 6.dp, y = 6.dp)
                            .background(MaterialTheme.colorScheme.surface, CircleShape)
                    )
                }
                Spacer(modifier = Modifier.width(20.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = doctor.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = doctor.specialization,
                        fontSize = 15.sp,
                        color = SwastikPrimary,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = qualificationText,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Stats row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                DoctorStatCard(
                    icon = Icons.Filled.Star,
                    iconTint = Color(0xFFFFB800),
                    title = ratingValue?.let { String.format(Locale.US, "%.1f", it) } ?: "New",
                    subtitle = reviewCount?.let { if (it == 1) "1 review" else "$it reviews" } ?: stringResource(R.string.rating),
                    modifier = Modifier.weight(1f)
                )
                DoctorStatCard(
                    icon = Icons.Outlined.Work,
                    iconTint = SwastikPrimary,
                    title = doctor.experienceYears?.takeIf { it > 0 }?.let { "$it+" } ?: "Not set",
                    subtitle = "Years Exp",
                    modifier = Modifier.weight(1f)
                )
                DoctorStatCard(
                    icon = Icons.Outlined.Payments,
                    iconTint = Color(0xFF4CAF50),
                    title = doctor.consultationFee?.let { "₹$it" } ?: "Not set",
                    subtitle = "Fee",
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(28.dp))
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.2f))
            Spacer(modifier = Modifier.height(28.dp))

            // About section
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Text(
                    stringResource(R.string.about_doctor),
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = bioText,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 22.sp
                )

                if (languagesText != null) {
                    Spacer(modifier = Modifier.height(20.dp))
                    Text(
                        "Languages",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = languagesText,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 22.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(36.dp))

            // Book Action
            Button(
                onClick = onBookClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) {
                Text(stringResource(R.string.book_appointment), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun DoctorStatCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(vertical = 16.dp, horizontal = 4.dp)
        ) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.height(12.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
