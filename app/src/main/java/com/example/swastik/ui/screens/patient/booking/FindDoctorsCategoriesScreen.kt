package com.example.swastik.ui.screens.patient.booking

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
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

// ====== Data Models ======

data class SpecialityItem(
    val name: String,
    val icon: ImageVector,
    val bgColor: Color,
    val iconTint: Color = Color.White
)

data class SurgeryCondition(
    val name: String,
    val icon: ImageVector,
    val bgColor: Color
)

data class SymptomItem(
    val name: String,
    val icon: ImageVector,
    val bgColor: Color
)

data class CategoryCardItem(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val gradientColors: List<Color>
)

// ====== Data ======

val mostSearchedSpecialities = listOf(
    SpecialityItem("General\nPhysician", Icons.Outlined.MedicalServices, Color(0xFFE8F0FE), Color(0xFF4285F4)),
    SpecialityItem("Skin & Hair", Icons.Outlined.Face, Color(0xFFFCE4EC), Color(0xFFE91E63)),
    SpecialityItem("Women's\nHealth", Icons.Outlined.PregnantWoman, Color(0xFFF3E5F5), Color(0xFF9C27B0)),
    SpecialityItem("Dental Care", Icons.Outlined.Mood, Color(0xFFE0F7FA), Color(0xFF00BCD4)),
    SpecialityItem("Child\nSpecialist", Icons.Outlined.ChildCare, Color(0xFFFFF3E0), Color(0xFFFF9800)),
    SpecialityItem("Ear, Nose,\nThroat", Icons.Outlined.Hearing, Color(0xFFE8EAF6), Color(0xFF3F51B5)),
    SpecialityItem("Mental\nWellness", Icons.Outlined.Psychology, Color(0xFFE0F2F1), Color(0xFF009688)),
    SpecialityItem("Bones &\nJoints", Icons.Outlined.Accessibility, Color(0xFFFBE9E7), Color(0xFFFF5722))
)

val surgeryConditions = listOf(
    SurgeryCondition("Piles/\nHemorrhoids", Icons.Outlined.LocalHospital, Color(0xFFFFCDD2)),
    SurgeryCondition("Hernia", Icons.Outlined.Healing, Color(0xFFFFE0B2)),
    SurgeryCondition("Appendicitis", Icons.Outlined.MedicalInformation, Color(0xFFC8E6C9)),
    SurgeryCondition("Anal Fissure/\nAnal Fistula", Icons.Outlined.MedicalServices, Color(0xFFB3E5FC)),
    SurgeryCondition("Varicose\nVein", Icons.Outlined.Healing, Color(0xFFE1BEE7)),
    SurgeryCondition("Kidney\nStone", Icons.Outlined.WaterDrop, Color(0xFFB2DFDB)),
    SurgeryCondition("Gall Stones", Icons.Outlined.Biotech, Color(0xFFFFE0B2)),
    SurgeryCondition("Circumcision", Icons.Outlined.ContentCut, Color(0xFFD1C4E9))
)

val mostCommonSymptoms = listOf(
    SymptomItem("COVID", Icons.Outlined.Coronavirus, Color(0xFFFFCDD2)),
    SymptomItem("Stomach\nPain", Icons.Outlined.Sick, Color(0xFFFFE0B2)),
    SymptomItem("Headache", Icons.Outlined.Face, Color(0xFFBBDEFB)),
    SymptomItem("Sinusitis", Icons.Outlined.AcUnit, Color(0xFFC8E6C9)),
    SymptomItem("Vertigo", Icons.Outlined.Rotate90DegreesCcw, Color(0xFFE1BEE7)),
    SymptomItem("Cold &\nCough", Icons.Outlined.Thermostat, Color(0xFFB2EBF2)),
    SymptomItem("Fever", Icons.Outlined.DeviceThermostat, Color(0xFFFFCCBC)),
    SymptomItem("Constipation", Icons.Outlined.RestaurantMenu, Color(0xFFD7CCC8))
)

val categoryCards = listOf(
    CategoryCardItem(
        "Skin and Hair",
        "Find doctors for issues like acne, hairfall, and other skin & hair concerns",
        Icons.Outlined.Face,
        listOf(Color(0xFFF3E5F5), Color(0xFFE1BEE7))
    ),
    CategoryCardItem(
        "Women's Health",
        "Find doctors for women's gynaecological issues like PCOS, cysts and more",
        Icons.Outlined.PregnantWoman,
        listOf(Color(0xFFFCE4EC), Color(0xFFF8BBD0))
    ),
    CategoryCardItem(
        "Chronic Problems",
        "Find doctors who treat diabetes, asthma and other chronic problems",
        Icons.Outlined.Favorite,
        listOf(Color(0xFFFFEBEE), Color(0xFFFFCDD2))
    ),
    CategoryCardItem(
        "Bone and Joint",
        "Find doctors who treat fractures, body aches and other bone & joint issues",
        Icons.Outlined.Accessibility,
        listOf(Color(0xFFFFF3E0), Color(0xFFFFE0B2))
    ),
    CategoryCardItem(
        "Sexual Health",
        "Find doctors who can solve your sexual and genital problems",
        Icons.Outlined.FavoriteBorder,
        listOf(Color(0xFFE8EAF6), Color(0xFFC5CAE9))
    )
)

// ====== All Specialities (for "View All" & AllSpecialitiesScreen) ======

val allSpecialities = listOf(
    SpecialityItem("COVID", Icons.Outlined.Coronavirus, Color(0xFFFFCDD2), Color(0xFFD32F2F)),
    SpecialityItem("Skin & Hair", Icons.Outlined.Face, Color(0xFFFCE4EC), Color(0xFFE91E63)),
    SpecialityItem("Women's\nHealth", Icons.Outlined.PregnantWoman, Color(0xFFF3E5F5), Color(0xFF9C27B0)),
    SpecialityItem("General\nPhysician", Icons.Outlined.MedicalServices, Color(0xFFE8F0FE), Color(0xFF4285F4)),
    SpecialityItem("Dental Care", Icons.Outlined.Mood, Color(0xFFE0F7FA), Color(0xFF00BCD4)),
    SpecialityItem("Bones &\nJoints", Icons.Outlined.Accessibility, Color(0xFFFBE9E7), Color(0xFFFF5722)),
    SpecialityItem("Mental\nWellness", Icons.Outlined.Psychology, Color(0xFFE0F2F1), Color(0xFF009688)),
    SpecialityItem("Ear, Nose,\nThroat", Icons.Outlined.Hearing, Color(0xFFE8EAF6), Color(0xFF3F51B5)),
    SpecialityItem("Sexual\nHealth", Icons.Outlined.FavoriteBorder, Color(0xFFFCE4EC), Color(0xFFE91E63)),
    SpecialityItem("Child\nSpecialist", Icons.Outlined.ChildCare, Color(0xFFFFF3E0), Color(0xFFFF9800)),
    SpecialityItem("Homeopathy", Icons.Outlined.Spa, Color(0xFFE8F5E9), Color(0xFF4CAF50)),
    SpecialityItem("Digestive\nIssues", Icons.Outlined.Sick, Color(0xFFFFF8E1), Color(0xFFFFC107)),
    SpecialityItem("Eye\nSpecialist", Icons.Outlined.Visibility, Color(0xFFE3F2FD), Color(0xFF2196F3)),
    SpecialityItem("Heart", Icons.Outlined.Favorite, Color(0xFFFFEBEE), Color(0xFFF44336)),
    SpecialityItem("Physio-\ntherapy", Icons.Outlined.FitnessCenter, Color(0xFFE0F2F1), Color(0xFF009688)),
    SpecialityItem("Brain and\nNerves", Icons.Outlined.Psychology, Color(0xFFF3E5F5), Color(0xFF7B1FA2)),
    SpecialityItem("Lungs and\nBreathing", Icons.Outlined.Air, Color(0xFFE1F5FE), Color(0xFF03A9F4)),
    SpecialityItem("Kidney\nIssues", Icons.Outlined.WaterDrop, Color(0xFFFFCDD2), Color(0xFFEF5350)),
    SpecialityItem("General\nSurgery", Icons.Outlined.LocalHospital, Color(0xFFE8EAF6), Color(0xFF5C6BC0)),
    SpecialityItem("Diabetes\nManagement", Icons.Outlined.MonitorHeart, Color(0xFFE0F7FA), Color(0xFF0097A7)),
    SpecialityItem("Ayurveda", Icons.Outlined.Spa, Color(0xFFE8F5E9), Color(0xFF388E3C)),
    SpecialityItem("Cancer", Icons.Outlined.LocalHospital, Color(0xFFFCE4EC), Color(0xFFC2185B)),
    SpecialityItem("Urinary\nIssues", Icons.Outlined.WaterDrop, Color(0xFFE8EAF6), Color(0xFF5C6BC0)),
    SpecialityItem("Veterinary", Icons.Outlined.Pets, Color(0xFFFFF3E0), Color(0xFFE65100)),
    SpecialityItem("Diet &\nNutrition", Icons.Outlined.RestaurantMenu, Color(0xFFE8F5E9), Color(0xFF43A047))
)

// ====== MAIN SCREEN ======

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FindDoctorsCategoriesScreen(
    mode: String,
    onBackClick: () -> Unit,
    onSpecialityClick: (String) -> Unit,
    onViewAllSpecialities: () -> Unit = {}
) {
    val scrollState = rememberScrollState()
    var searchQuery by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        stringResource(R.string.search_doctors_specialist),
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SwastikPurple,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .verticalScroll(scrollState)
        ) {
            // ── Mode Banner ──
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            if (mode == "in_person")
                                listOf(SwastikPurple, SwastikPurpleDark)
                            else
                                listOf(CardBlue, Color(0xFF2962FF))
                        )
                    )
                    .padding(horizontal = 20.dp, vertical = 14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (mode == "in_person") Icons.Outlined.PersonPinCircle else Icons.Outlined.Videocam,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = if (mode == "in_person") stringResource(R.string.in_person_consultation_desc) else stringResource(R.string.video_consultation_desc),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Help Banner ──
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .clickable { },
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Outlined.Help,
                        contentDescription = null,
                        tint = SwastikPurple,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        stringResource(R.string.learn_how_to_book),
                        fontSize = 14.sp,
                        color = TextPrimary,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Search Bar ──
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                placeholder = {
                    Text(
                        stringResource(R.string.search_symptoms_specialities),
                        color = TextHint,
                        fontSize = 15.sp
                    )
                },
                leadingIcon = {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = "Search",
                        tint = SwastikPurple,
                        modifier = Modifier.size(24.dp)
                    )
                },
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = Color.LightGray.copy(alpha = 0.5f),
                    focusedBorderColor = SwastikPurple,
                    unfocusedContainerColor = Color.White,
                    focusedContainerColor = Color.White
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(24.dp))

            // ── Most Searched Specialities ──
            SectionHeader(title = stringResource(R.string.most_searched_specialities))
            Spacer(modifier = Modifier.height(16.dp))
            SpecialitiesGrid(
                items = mostSearchedSpecialities,
                onItemClick = { onSpecialityClick(it.name.replace("\n", " ")) }
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ── View All Specialities Button ──
            OutlinedButton(
                onClick = onViewAllSpecialities,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, SwastikPurple)
            ) {
                Text(
                    stringResource(R.string.view_all_specialities),
                    color = SwastikPurple,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // ── Conditions treated through surgeries ──
            SectionHeader(title = stringResource(R.string.surgery_conditions))
            Text(
                "Find top surgeons near you for your surgical procedure",
                fontSize = 13.sp,
                color = TextSecondary,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            SurgeryConditionsRow(
                items = surgeryConditions,
                onItemClick = { onSpecialityClick(it.name.replace("\n", " ")) }
            )

            Spacer(modifier = Modifier.height(28.dp))

            // ── Most Common Symptoms ──
            SectionHeader(title = stringResource(R.string.common_symptoms))
            Spacer(modifier = Modifier.height(16.dp))
            SpecialitiesGrid(
                items = mostCommonSymptoms.map {
                    SpecialityItem(it.name, it.icon, it.bgColor, it.bgColor.copy(alpha = 1f).let { c ->
                        // Derive a darker tint for the icon
                        Color(
                            red = (c.red * 0.6f).coerceIn(0f, 1f),
                            green = (c.green * 0.6f).coerceIn(0f, 1f),
                            blue = (c.blue * 0.6f).coerceIn(0f, 1f)
                        )
                    })
                },
                onItemClick = { onSpecialityClick(it.name.replace("\n", " ")) }
            )

            Spacer(modifier = Modifier.height(28.dp))

            // ── Categories (Large Cards) ──
            SectionHeader(title = "Categories")
            Spacer(modifier = Modifier.height(16.dp))
            CategoriesGrid(
                items = categoryCards,
                onItemClick = { onSpecialityClick(it.title) }
            )

            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

// ====== Section Header ======

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        color = TextPrimary,
        modifier = Modifier.padding(horizontal = 16.dp)
    )
}

// ====== 4-Column Specialities Grid ======

@Composable
private fun SpecialitiesGrid(
    items: List<SpecialityItem>,
    onItemClick: (SpecialityItem) -> Unit
) {
    val rows = items.chunked(4)
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        rows.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                row.forEach { item ->
                    SpecialityCircleItem(
                        item = item,
                        onClick = { onItemClick(item) },
                        modifier = Modifier.weight(1f)
                    )
                }
                // Fill remaining space if row is incomplete
                repeat(4 - row.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun SpecialityCircleItem(
    item: SpecialityItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .clickable { onClick() }
            .padding(horizontal = 4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .shadow(4.dp, CircleShape)
                .clip(CircleShape)
                .background(item.bgColor),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = item.icon,
                contentDescription = item.name,
                tint = item.iconTint,
                modifier = Modifier.size(30.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = item.name,
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

// ====== Surgery Conditions Horizontal Scroll ======

@Composable
private fun SurgeryConditionsRow(
    items: List<SurgeryCondition>,
    onItemClick: (SurgeryCondition) -> Unit
) {
    val rows = items.chunked(4)
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        rows.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                row.forEach { item ->
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onItemClick(item) }
                            .padding(horizontal = 4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .shadow(4.dp, CircleShape)
                                .clip(CircleShape)
                                .background(item.bgColor),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = item.icon,
                                contentDescription = item.name,
                                tint = Color(0xFF5D4037),
                                modifier = Modifier.size(30.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = item.name,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            textAlign = TextAlign.Center,
                            maxLines = 2,
                            lineHeight = 14.sp,
                            color = TextPrimary
                        )
                    }
                }
                repeat(4 - row.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

// ====== Categories Large Cards Grid ======

@Composable
private fun CategoriesGrid(
    items: List<CategoryCardItem>,
    onItemClick: (CategoryCardItem) -> Unit
) {
    val rows = items.chunked(2)
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        rows.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                row.forEach { item ->
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .height(200.dp)
                            .clickable { onItemClick(item) },
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize()
                        ) {
                            // Gradient icon area
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(100.dp)
                                    .background(
                                        Brush.verticalGradient(item.gradientColors)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = item.icon,
                                    contentDescription = item.title,
                                    tint = item.gradientColors.last().copy(alpha = 0.6f).let { c ->
                                        Color(
                                            red = (c.red * 0.4f).coerceIn(0f, 1f),
                                            green = (c.green * 0.4f).coerceIn(0f, 1f),
                                            blue = (c.blue * 0.4f).coerceIn(0f, 1f)
                                        )
                                    },
                                    modifier = Modifier.size(48.dp)
                                )
                            }
                            // Text area
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp)
                            ) {
                                Text(
                                    text = item.title,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    maxLines = 1
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = item.description,
                                    fontSize = 11.sp,
                                    color = TextSecondary,
                                    maxLines = 3,
                                    lineHeight = 14.sp,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
                if (row.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
