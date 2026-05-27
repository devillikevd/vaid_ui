package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.ui.theme.*

import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items

@Composable
fun FindDoctorsBySpecialitySection(
    onSpecialityClick: (String) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) } // 0: General, 1: Advanced

    val generalCare = listOf(
        "General Physician", "Dentist", "Ear, Nose & Throat", "Eye Specialist",
        "Skin Specialist", "Child Care", "Women's Health", "Mental Wellness"
    )
    val advancedCare = listOf(
        "Heart Specialist", "Brain & Nerves", "Bones & Joints", "Stomach & Digestion",
        "Urinary Issues", "Diabetes Management", "Cancer Specialist", "Lungs & Breathing"
    )

    val currentList = if (selectedTab == 0) generalCare else advancedCare

    Column(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Text(
                "Book Doctor by Speciality",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 17.sp,
                color = Color(0xFF1A1A1A),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(40.dp)
                    .background(Color(0xFFE8F1EE), RoundedCornerShape(20.dp))
                    .padding(2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                listOf("General Care", "Advanced Care").forEachIndexed { index, title ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(18.dp))
                            .background(if (selectedTab == index) Color(0xFF00796B) else Color.Transparent)
                            .clickable { selectedTab = index },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = title,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (selectedTab == index) Color.White else Color(0xFF5F6B6A),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }

        // Horizontally scrollable list - shows all 8 cards
        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(currentList) { speciality ->
                SpecialityHomeCard(
                    title = speciality,
                    modifier = Modifier.width(92.dp), // Compressed size to fit ~4 on screen
                    onClick = { onSpecialityClick(speciality) }
                )
            }
        }
    }
}

@Composable
fun SpecialityCard(
    name: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    bgColor: Color,
    iconTint: Color,
    imageRes: Int? = null,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(105.dp)
            .height(115.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Background Image or Icon
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(if (imageRes == null) bgColor.copy(alpha = 0.4f) else Color.Transparent),
                contentAlignment = Alignment.Center
            ) {
                if (imageRes != null) {
                    Image(
                        painter = painterResource(id = imageRes),
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Icon(
                        imageVector = icon,
                        contentDescription = name,
                        tint = iconTint,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }

            // Seamless Text Overlay at the bottom
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                MaterialTheme.colorScheme.surface.copy(alpha = 0.7f),
                                MaterialTheme.colorScheme.surface
                            )
                        )
                    )
                    .padding(bottom = 8.dp, top = 24.dp, start = 4.dp, end = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = name,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    lineHeight = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun SpecialityHomeCard(
    title: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val imageRes = when (title) {
        "General Physician" -> R.drawable.generalphysician
        "Women's Health" -> R.drawable.womenhealth
        "Skin Specialist" -> R.drawable.skinnspecialist
        "Child Care" -> R.drawable.childspecialist
        "Dentist" -> R.drawable.dentists
        "Eye Specialist" -> R.drawable.eyespecialist
        "Ear, Nose & Throat" -> R.drawable.eatspecialist
        "Mental Wellness" -> R.drawable.mentalwelnness
        "Heart Specialist" -> R.drawable.hearspecialist
        "Brain & Nerves" -> R.drawable.brainnerve
        "Bones & Joints" -> R.drawable.bonesjoint
        "Stomach & Digestion" -> R.drawable.stomatchdigestion
        "Urinary Issues" -> R.drawable.urinanry
        "Diabetes Management" -> R.drawable.diabites
        "Cancer Specialist" -> R.drawable.cancer
        "Lungs & Breathing" -> R.drawable.lungs
        else -> null
    }

    Card(
        modifier = modifier
            .aspectRatio(0.82f)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.LightGray.copy(alpha = 0.2f))
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            if (imageRes != null) {
                Image(
                    painter = painterResource(id = imageRes),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.White, Color.White),
                            startY = 0f
                        )
                    )
                    .padding(bottom = 8.dp, top = 16.dp)
            ) {
                Text(
                    text = title,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black,
                    textAlign = TextAlign.Center,
                    lineHeight = 11.sp,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
