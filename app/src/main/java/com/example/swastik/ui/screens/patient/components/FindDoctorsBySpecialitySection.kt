package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import com.example.swastik.ui.theme.*

private data class HomeSpeciality(
    val name: String,
    val icon: ImageVector,
    val bgColor: Color,
    val iconTint: Color
)

private val generalCareItems = listOf(
    HomeSpeciality("General\nPhysician", Icons.Outlined.MedicalServices, Color(0xFFE8F0FE), Color(0xFF4285F4)),
    HomeSpeciality("Women's\nHealth", Icons.Outlined.PregnantWoman, Color(0xFFF3E5F5), Color(0xFF9C27B0)),
    HomeSpeciality("Skin\nSpecialist", Icons.Outlined.Face, Color(0xFFFCE4EC), Color(0xFFE91E63)),
    HomeSpeciality("Child\nCare", Icons.Outlined.ChildCare, Color(0xFFFFF3E0), Color(0xFFFF9800)),
    HomeSpeciality("Dentist", Icons.Outlined.Mood, Color(0xFFE0F7FA), Color(0xFF00BCD4)),
    HomeSpeciality("Eye\nSpecialist", Icons.Outlined.Visibility, Color(0xFFE3F2FD), Color(0xFF2196F3)),
    HomeSpeciality("Ear, Nose &\nThroat", Icons.Outlined.Hearing, Color(0xFFE8EAF6), Color(0xFF3F51B5)),
    HomeSpeciality("Mental\nWellness", Icons.Outlined.Psychology, Color(0xFFE0F2F1), Color(0xFF009688))
)

private val advancedCareItems = listOf(
    HomeSpeciality("Bones &\nJoints", Icons.Outlined.Accessibility, Color(0xFFFBE9E7), Color(0xFFFF5722)),
    HomeSpeciality("Brain &\nNerves", Icons.Outlined.Psychology, Color(0xFFF3E5F5), Color(0xFF7B1FA2)),
    HomeSpeciality("Urinary\nIssues", Icons.Outlined.WaterDrop, Color(0xFFE8EAF6), Color(0xFF5C6BC0)),
    HomeSpeciality("Lungs &\nBreathing", Icons.Outlined.Air, Color(0xFFE1F5FE), Color(0xFF03A9F4)),
    HomeSpeciality("Heart\nSpecialist", Icons.Outlined.Favorite, Color(0xFFFFEBEE), Color(0xFFF44336)),
    HomeSpeciality("Stomach &\nDigestion", Icons.Outlined.Sick, Color(0xFFFFF8E1), Color(0xFFFFC107)),
    HomeSpeciality("Diabetes\nManagement", Icons.Outlined.MonitorHeart, Color(0xFFE0F7FA), Color(0xFF0097A7)),
    HomeSpeciality("Cancer\nSpecialist", Icons.Outlined.LocalHospital, Color(0xFFFCE4EC), Color(0xFFC2185B))
)

/**
 * "Find doctors by speciality" section for the Home tab,
 * matching screenshots 7-10 with General Care / Advanced Care tabs
 * and horizontally scrollable speciality cards.
 */
@Composable
fun FindDoctorsBySpecialitySection(
    onSpecialityClick: (String) -> Unit = {}
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val items = if (selectedTab == 0) generalCareItems else advancedCareItems

    Column(
        modifier = Modifier.padding(horizontal = 20.dp)
    ) {
        Text(
            text = stringResource(R.string.book_doctor_by_speciality),
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary
        )

        Spacer(modifier = Modifier.height(14.dp))

        // Tabs
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFFF0F0F5))
                .padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            listOf("General Care", "Advanced Care").forEachIndexed { index, label ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            if (selectedTab == index) Color.White else Color.Transparent
                        )
                        .clickable { selectedTab = index }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        fontSize = 14.sp,
                        fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal,
                        color = if (selectedTab == index) TextPrimary else TextSecondary
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Horizontally scrollable speciality cards - 2 rows
        val rows = items.chunked(4)
        Column(
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            rows.forEach { row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    row.forEach { item ->
                        SpecialityCard(
                            name = item.name,
                            icon = item.icon,
                            bgColor = item.bgColor,
                            iconTint = item.iconTint,
                            onClick = { onSpecialityClick(item.name.replace("\n", " ")) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SpecialityCard(
    name: String,
    icon: ImageVector,
    bgColor: Color,
    iconTint: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(110.dp)
            .height(120.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .shadow(2.dp, CircleShape)
                    .clip(CircleShape)
                    .background(bgColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = name,
                    tint = iconTint,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = name,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                maxLines = 2,
                lineHeight = 14.sp,
                color = TextPrimary,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
