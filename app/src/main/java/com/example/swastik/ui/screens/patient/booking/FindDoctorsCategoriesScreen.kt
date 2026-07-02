package com.example.swastik.ui.screens.patient.booking

import androidx.activity.compose.BackHandler
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
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
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.NorthEast
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
import com.example.swastik.utils.getTranslatedCategoryText
import com.example.swastik.ui.theme.*

// ====== Data Models ======

import com.example.swastik.ui.screens.patient.components.SpecialityCard
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.material3.MaterialTheme

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
    val gradientColors: List<Color>,
    val imageRes: Int? = null
)

// ====== Data ======

val mostSearchedSpecialities = listOf(
    SpecialityItem("General\nPhysician", Icons.Outlined.MedicalServices, Color(0xFFE8F0FE), Color(0xFF4285F4)),
    SpecialityItem("Dermatologist", Icons.Outlined.Face, Color(0xFFFCE4EC), Color(0xFFE91E63)),
    SpecialityItem("Gynecologist", Icons.Outlined.PregnantWoman, Color(0xFFF3E5F5), Color(0xFF9C27B0)),
    SpecialityItem("Dental Care", Icons.Outlined.Mood, Color(0xFFE0F7FA), Color(0xFF00BCD4)),
    SpecialityItem("Child\nSpecialist", Icons.Outlined.ChildCare, Color(0xFFFFF3E0), Color(0xFFFF9800)),
    SpecialityItem("Ear, Nose,\nThroat", Icons.Outlined.Hearing, Color(0xFFE8EAF6), Color(0xFF3F51B5)),
    SpecialityItem("Mental\nWellness", Icons.Outlined.Psychology, Color(0xFFE0F2F1), Color(0xFF009688)),
    SpecialityItem("Bones &\nJoints", Icons.Outlined.Accessibility, Color(0xFFFBE9E7), Color(0xFFFF5722)),
    SpecialityItem("Sexual\nHealth", Icons.Outlined.FavoriteBorder, Color(0xFFFCE4EC), Color(0xFFE91E63)),
    SpecialityItem("Digestive\nIssues", Icons.Outlined.Sick, Color(0xFFFFF8E1), Color(0xFFFFC107)),
    SpecialityItem("Eye\nSpecialist", Icons.Outlined.Visibility, Color(0xFFE3F2FD), Color(0xFF2196F3)),
    SpecialityItem("Heart", Icons.Outlined.Favorite, Color(0xFFFFEBEE), Color(0xFFF44336)),
    SpecialityItem("Diabetes\nManagement", Icons.Outlined.MonitorHeart, Color(0xFFE0F7FA), Color(0xFF0097A7)),
    SpecialityItem("Brain and\nNerves", Icons.Outlined.Psychology, Color(0xFFF3E5F5), Color(0xFF7B1FA2)),
    SpecialityItem("Lungs and\nBreathing", Icons.Outlined.Air, Color(0xFFE1F5FE), Color(0xFF03A9F4)),
    SpecialityItem("General\nSurgery", Icons.Outlined.LocalHospital, Color(0xFFE8EAF6), Color(0xFF5C6BC0)),
    SpecialityItem("Ayurveda", Icons.Outlined.Spa, Color(0xFFF1F7F7), Color(0xFF388E3C)),
    SpecialityItem("Homeopathy", Icons.Outlined.Spa, Color(0xFFF1F7F7), Color(0xFF4CAF50))
)

val surgeryConditions = listOf(
    SurgeryCondition("Piles/\nHemorrhoids", Icons.Outlined.LocalHospital, Color(0xFFFFCDD2)),
    SurgeryCondition("Hernia", Icons.Outlined.Healing, Color(0xFFFFE0B2)),
    SurgeryCondition("Appendicitis", Icons.Outlined.MedicalInformation, Color(0xFFE0F2F1)),
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
    SymptomItem("Sinusitis", Icons.Outlined.AcUnit, Color(0xFFE0F2F1)),
    SymptomItem("Vertigo", Icons.Outlined.Rotate90DegreesCcw, Color(0xFFE1BEE7)),
    SymptomItem("Cold &\nCough", Icons.Outlined.Thermostat, Color(0xFFB2EBF2)),
    SymptomItem("Fever", Icons.Outlined.DeviceThermostat, Color(0xFFFFCCBC)),
    SymptomItem("Constipation", Icons.Outlined.RestaurantMenu, Color(0xFFD7CCC8))
)

fun getSpecialityImage(name: String): Int? {
    val lower = name.lowercase().replace("\n", " ")
    return when {
        lower.contains("heart") || lower.contains("cardio") -> R.drawable.hearspecialist
        lower.contains("general physician") -> R.drawable.generalphysician
        lower.contains("general surgery") || lower.contains("general surgeon") -> R.drawable.genralsurgen
        lower.contains("skin") || lower.contains("dermatologist") -> R.drawable.skinnspecialist
        lower.contains("women") || lower.contains("gynecologist") -> R.drawable.womenhealth
        lower.contains("dental") || lower.contains("dentist") -> R.drawable.dentists
        lower.contains("child") || lower.contains("pediatrician") -> R.drawable.childspecialist
        lower.contains("mental") || lower.contains("psychiatrist") || lower.contains("psychologist") -> R.drawable.mentalwelnness
        lower.contains("diabetes") || lower.contains("diabetologist") -> R.drawable.diabites
        lower.contains("ear") || lower.contains("nose") || lower.contains("throat") || lower.contains(" ent") || lower.startsWith("ent") -> R.drawable.eatspecialist
        lower.contains("cancer") || lower.contains("oncology") -> R.drawable.cancer
        lower.contains("covid") -> R.drawable.covid
        lower.contains("headache") -> R.drawable.headache
        lower.contains("sinus") -> R.drawable.sinusitis
        lower.contains("vertigo") -> R.drawable.vertigo
        lower.contains("cold") || lower.contains("cough") -> R.drawable.coldcough
        lower.contains("fever") -> R.drawable.fever
        lower.contains("constipation") -> R.drawable.constipation
        lower.contains("bone") || lower.contains("orthopedist") -> R.drawable.bonesjoint
        lower.contains("brain") || lower.contains("neurologist") -> R.drawable.brainnerve
        lower.contains("urinary") || lower.contains("urologist") -> R.drawable.urinanry
        lower.contains("lung") || lower.contains("pulmonologist") -> R.drawable.lungs
        lower.contains("stomach") || lower.contains("digestive") || lower.contains("gastroenterologist") -> R.drawable.stomatchdigestion
        lower.contains("sexual") || lower.contains("sexologist") -> R.drawable.sexualhealth
        lower.contains("homeopathy") -> R.drawable.homeopathy
        lower.contains("eye") || lower.contains("ophthalmologist") -> R.drawable.eyespecialist
        lower.contains("physio") -> R.drawable.physiotherapist
        lower.contains("kidney") || lower.contains("nephrologist") -> R.drawable.kidney_stone_icon
        lower.contains("ayurveda") -> R.drawable.ayurveda
        lower.contains("veterinary") -> R.drawable.veterinary_icon
        lower.contains("diet") || lower.contains("nutrition") -> R.drawable.dietnutrition
        lower.contains("piles") -> R.drawable.piles
        lower.contains("hernia") -> R.drawable.hernia
        lower.contains("appendicitis") -> R.drawable.appendictics
        lower.contains("anal fissure") || lower.contains("anal fistula") -> R.drawable.analfissureanalfistula
        lower.contains("varicose vein") -> R.drawable.varicosevein
        lower.contains("gall stone") -> R.drawable.gallstone
        lower.contains("circumcision") -> R.drawable.circumcision
        lower.contains("endocrinologist") -> R.drawable.endocrinologist
        lower.contains("rheumatologist") -> R.drawable.rheumatologist
        lower.contains("plastic surgeon") -> R.drawable.plasticsurgeon
        lower.contains("fertility") || lower.contains("ivf") -> R.drawable.ivf
        lower.contains("spine") -> R.drawable.spinespecialist
        lower.contains("liver") -> R.drawable.liverspecialist
        lower.contains("allergy") -> R.drawable.allergyspecialist
        lower.contains("hair transplant") -> R.drawable.hairtransplant
        lower.contains("vascular surgeon") -> R.drawable.vascularsurgeon
        lower.contains("laparoscopic") -> R.drawable.laparoscopic
        lower.contains("proctologist") -> R.drawable.analfissureanalfistula
        lower.contains("pain management") -> R.drawable.chronicpain
        lower.contains("sports medicine") -> R.drawable.sportsinjury
        else -> null
    }
}

val categoryCards = listOf(
    CategoryCardItem("General Physician", "Treats common illnesses and provides primary care", Icons.Outlined.MedicalServices, listOf(Color(0xFFE3F2FD), Color(0xFFBBDEFB)), R.drawable.generalphysician),
    CategoryCardItem("Dermatologist", "Specialist for skin, hair, and nail conditions", Icons.Outlined.Face, listOf(Color(0xFFF3E5F5), Color(0xFFE1BEE7)), R.drawable.skinnspecialist),
    CategoryCardItem("Gynecologist", "Specialist for women's reproductive health and pregnancy", Icons.Outlined.PregnantWoman, listOf(Color(0xFFFCE4EC), Color(0xFFF8BBD0)), R.drawable.womenhealth),
    CategoryCardItem("Orthopedist", "Specialist for bone, joint, and muscle issues", Icons.Outlined.Accessibility, listOf(Color(0xFFFFF3E0), Color(0xFFFFE0B2)), R.drawable.bonesjoint),
    CategoryCardItem("Pediatrician", "Specialist for infants, children, and adolescents", Icons.Outlined.ChildCare, listOf(Color(0xFFF1F7F7), Color(0xFFE0F2F1)), R.drawable.childspecialist),
    CategoryCardItem("ENT Specialist", "Specialist for ear, nose, and throat issues", Icons.Outlined.Hearing, listOf(Color(0xFFE0F2F1), Color(0xFFB2DFDB)), R.drawable.eatspecialist),
    CategoryCardItem("Cardiologist", "Specialist for heart and blood vessel conditions", Icons.Outlined.Favorite, listOf(Color(0xFFFFEBEE), Color(0xFFFFCDD2)), R.drawable.hearspecialist),
    CategoryCardItem("Neurologist", "Specialist for brain, spine, and nervous system", Icons.Outlined.Psychology, listOf(Color(0xFFF3E5F5), Color(0xFFD1C4E9)), R.drawable.brainnerve),
    CategoryCardItem("Psychiatrist", "Specialist for mental, emotional, and behavioral health", Icons.Outlined.Psychology, listOf(Color(0xFFE1F5FE), Color(0xFFB3E5FC)), R.drawable.mentalwelnness),
    CategoryCardItem("Gastroenterologist", "Specialist for digestive system and liver issues", Icons.Outlined.Sick, listOf(Color(0xFFFFF8E1), Color(0xFFFFECB3)), R.drawable.stomatchdigestion),
    CategoryCardItem("Urologist", "Specialist for urinary tract and male reproductive health", Icons.Outlined.WaterDrop, listOf(Color(0xFFE8EAF6), Color(0xFFC5CAE9)), R.drawable.urinanry),
    CategoryCardItem("Sexologist", "Specialist for sexual health and intimacy concerns", Icons.Outlined.FavoriteBorder, listOf(Color(0xFFFCE4EC), Color(0xFFF8BBD0)), R.drawable.sexualhealth),
    CategoryCardItem("Dentist", "Specialist for oral health and dental procedures", Icons.Outlined.Mood, listOf(Color(0xFFE0F7FA), Color(0xFFB2EBF2)), R.drawable.dentists),
    CategoryCardItem("Ophthalmologist", "Specialist for eye and vision care", Icons.Outlined.Visibility, listOf(Color(0xFFE3F2FD), Color(0xFFBBDEFB)), R.drawable.eyespecialist),
    CategoryCardItem("Pulmonologist", "Specialist for lung and respiratory system", Icons.Outlined.Air, listOf(Color(0xFFE1F5FE), Color(0xFFB3E5FC)), R.drawable.lungs),
    CategoryCardItem("General Surgeon", "Performs surgical procedures for various conditions", Icons.Outlined.LocalHospital, listOf(Color(0xFFE8EAF6), Color(0xFFD1C4E9)), R.drawable.genralsurgen),
    CategoryCardItem("Physiotherapist", "Specialist for physical rehabilitation and movement", Icons.Outlined.FitnessCenter, listOf(Color(0xFFE0F2F1), Color(0xFFB2DFDB)), R.drawable.physiotherapist),
    CategoryCardItem("Diet & Nutrition", "Specialist for food, nutrition, and healthy lifestyle", Icons.Outlined.RestaurantMenu, listOf(Color(0xFFFFF3E0), Color(0xFFFFE0B2)), R.drawable.dietnutrition),
    CategoryCardItem("Ayurveda", "Holistic medicine system based on natural healing", Icons.Outlined.Spa, listOf(Color(0xFFF1F7F7), Color(0xFFE0F2F1)), R.drawable.ayurveda),
    CategoryCardItem("Homeopathy", "Alternative medicine based on natural substances", Icons.Outlined.Spa, listOf(Color(0xFFF1F8E9), Color(0xFFDCEDC8)), R.drawable.homeopathy),
    CategoryCardItem("Cancer Specialist", "Specialist for diagnosis and treatment of cancer", Icons.Outlined.LocalHospital, listOf(Color(0xFFFCE4EC), Color(0xFFF8BBD0)), R.drawable.cancer),
    CategoryCardItem("Diabetologist", "Specialist for diabetes management and control", Icons.Outlined.MonitorHeart, listOf(Color(0xFFE0F7FA), Color(0xFFB2EBF2)), R.drawable.diabites),
    CategoryCardItem("Nephrologist", "Specialist for kidney-related conditions and diseases", Icons.Outlined.WaterDrop, listOf(Color(0xFFFFEBEE), Color(0xFFFFCDD2)), R.drawable.kidney_stone_icon),
    CategoryCardItem("Endocrinologist", "Specialist for hormone-related disorders and glands", Icons.Outlined.Thermostat, listOf(Color(0xFFFFF8E1), Color(0xFFFFECB3)), R.drawable.endocrinologist),
    CategoryCardItem("Rheumatologist", "Specialist for arthritis and autoimmune diseases", Icons.Outlined.Accessibility, listOf(Color(0xFFE8EAF6), Color(0xFFC5CAE9)), R.drawable.rheumatologist),
    CategoryCardItem("Plastic Surgeon", "Specialist for reconstructive and cosmetic surgery", Icons.Outlined.Face, listOf(Color(0xFFF3E5F5), Color(0xFFE1BEE7)), R.drawable.plasticsurgeon),
    CategoryCardItem("Fertility / IVF Specialist", "Specialist for reproductive medicine and fertility", Icons.Outlined.PregnantWoman, listOf(Color(0xFFFCE4EC), Color(0xFFF8BBD0)), R.drawable.ivf),
    CategoryCardItem("Spine Specialist", "Specialist for back and spinal cord disorders", Icons.Outlined.Accessibility, listOf(Color(0xFFFFF3E0), Color(0xFFFFE0B2)), R.drawable.spinespecialist),
    CategoryCardItem("Liver Specialist", "Specialist for liver, gallbladder, and biliary tree", Icons.Outlined.Sick, listOf(Color(0xFFF1F7F7), Color(0xFFE0F2F1)), R.drawable.liverspecialist),
    CategoryCardItem("Kidney Specialist", "Focuses on kidney health and dialysis", Icons.Outlined.WaterDrop, listOf(Color(0xFFE0F2F1), Color(0xFFB2DFDB)), R.drawable.kidney_stone_icon),
    CategoryCardItem("Allergy Specialist", "Specialist for immune system reactions and allergies", Icons.Outlined.Healing, listOf(Color(0xFFE3F2FD), Color(0xFFBBDEFB)), R.drawable.allergyspecialist),
    CategoryCardItem("Hair Transplant Specialist", "Specialist for hair restoration and transplant", Icons.Outlined.Face, listOf(Color(0xFFF3E5F5), Color(0xFFE1BEE7)), R.drawable.hairtransplant),
    CategoryCardItem("Cosmetic Dermatologist", "Focuses on aesthetic skin treatments and care", Icons.Outlined.Face, listOf(Color(0xFFFCE4EC), Color(0xFFF8BBD0)), R.drawable.skinnspecialist),
    CategoryCardItem("Mental Health Specialist", "Supports mental, emotional, and social well-being", Icons.Outlined.Psychology, listOf(Color(0xFFE1F5FE), Color(0xFFB3E5FC)), R.drawable.mentalwelnness),
    CategoryCardItem("Vascular Surgeon", "Performs surgery on veins, arteries, and lymphatics", Icons.Outlined.Healing, listOf(Color(0xFFFFEBEE), Color(0xFFFFCDD2)), R.drawable.vascularsurgeon),
    CategoryCardItem("Proctologist", "Specialist for colorectal and anal conditions", Icons.Outlined.LocalHospital, listOf(Color(0xFFFFF8E1), Color(0xFFFFECB3)), R.drawable.analfissureanalfistula),
    CategoryCardItem("Laparoscopic Surgeon", "Specialist for minimally invasive surgeries", Icons.Outlined.Biotech, listOf(Color(0xFFE8EAF6), Color(0xFFC5CAE9)), R.drawable.laparoscopic),
    CategoryCardItem("Pain Management Specialist", "Helps in reducing or managing chronic pain", Icons.Outlined.HealthAndSafety, listOf(Color(0xFFE0F7FA), Color(0xFFB2EBF2)), R.drawable.chronicpain),
    CategoryCardItem("Sports Medicine Specialist", "Specialist for sports-related injuries and fitness", Icons.Outlined.FitnessCenter, listOf(Color(0xFFFFF3E0), Color(0xFFFFE0B2)), R.drawable.sportsinjury)
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
    SpecialityItem("Homeopathy", Icons.Outlined.Spa, Color(0xFFF1F7F7), Color(0xFF4CAF50)),
    SpecialityItem("Digestive\nIssues", Icons.Outlined.Sick, Color(0xFFFFF8E1), Color(0xFFFFC107)),
    SpecialityItem("Eye\nSpecialist", Icons.Outlined.Visibility, Color(0xFFE3F2FD), Color(0xFF2196F3)),
    SpecialityItem("Heart", Icons.Outlined.Favorite, Color(0xFFFFEBEE), Color(0xFFF44336)),
    SpecialityItem("Physio-\ntherapy", Icons.Outlined.FitnessCenter, Color(0xFFE0F2F1), Color(0xFF009688)),
    SpecialityItem("Brain and\nNerves", Icons.Outlined.Psychology, Color(0xFFF3E5F5), Color(0xFF7B1FA2)),
    SpecialityItem("Lungs and\nBreathing", Icons.Outlined.Air, Color(0xFFE1F5FE), Color(0xFF03A9F4)),
    SpecialityItem("Kidney\nIssues", Icons.Outlined.WaterDrop, Color(0xFFFFCDD2), Color(0xFFEF5350)),
    SpecialityItem("General\nSurgery", Icons.Outlined.LocalHospital, Color(0xFFE8EAF6), Color(0xFF5C6BC0)),
    SpecialityItem("Diabetes\nManagement", Icons.Outlined.MonitorHeart, Color(0xFFE0F7FA), Color(0xFF0097A7)),
    SpecialityItem("Ayurveda", Icons.Outlined.Spa, Color(0xFFF1F7F7), Color(0xFF388E3C)),
    SpecialityItem("Cancer", Icons.Outlined.LocalHospital, Color(0xFFFCE4EC), Color(0xFFC2185B)),
    SpecialityItem("Urinary\nIssues", Icons.Outlined.WaterDrop, Color(0xFFE8EAF6), Color(0xFF5C6BC0)),
    SpecialityItem("Veterinary", Icons.Outlined.Pets, Color(0xFFFFF3E0), Color(0xFFE65100)),
    SpecialityItem("Diet &\nNutrition", Icons.Outlined.RestaurantMenu, Color(0xFFF1F7F7), Color(0xFF43A047))
)

// ====== MAIN SCREEN ======

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FindDoctorsCategoriesScreen(
    mode: String,
    onBackClick: () -> Unit,
    onSpecialityClick: (String?, String?) -> Unit,
    onViewAllSpecialities: () -> Unit = {},
    onViewAllCategories: () -> Unit = {}
) {
    val scrollState = rememberScrollState()
    var searchQuery by remember { mutableStateOf("") }
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val focusManager = androidx.compose.ui.platform.LocalFocusManager.current

    // Handle back button when search suggestions are visible
    if (isFocused || searchQuery.isNotEmpty()) {
        BackHandler {
            if (searchQuery.isNotEmpty()) {
                searchQuery = ""
            } else {
                focusManager.clearFocus()
            }
        }
    }

    // Filter logic for search results
    val filteredSpecialities = if (searchQuery.isEmpty()) emptyList() else {
        (allSpecialities.map { it.name } + categoryCards.map { it.title })
            .filter { it.contains(searchQuery, ignoreCase = true) }
            .distinct()
            .take(6)
    }

    // Default suggestions when focused but empty
    val suggestions = listOf("Fever", "Headache", "Dermatologist", "Gynecologist", "Cough", "Dentist")

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        stringResource(R.string.find_doctors),
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
                    containerColor = SwastikPrimary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .verticalScroll(scrollState)
        ) {
            // ── Mode Banner ──
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SwastikPrimaryLight)
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(SwastikPrimary),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            if (mode == "in_person") Icons.Outlined.PersonPinCircle else Icons.Outlined.Videocam,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = if (mode == "in_person") stringResource(R.string.in_person_consultation) else stringResource(R.string.video_consultation),
                            color = SwastikPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = if (mode == "in_person") stringResource(R.string.in_person_consultation_desc) else stringResource(R.string.video_consultation_desc),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Medium,
                            fontSize = 12.sp
                        )
                    }
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
                        tint = SwastikPrimary,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        stringResource(R.string.learn_how_to_book),
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Search Bar ──
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = {
                        Text(
                            stringResource(R.string.search_symptoms_specialities),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 15.sp
                        )
                    },
                    leadingIcon = {
                        Icon(
                            Icons.Default.Search,
                            contentDescription = "Search",
                            tint = SwastikPrimary,
                            modifier = Modifier.size(24.dp)
                        )
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Close, contentDescription = "Clear", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    },
                    interactionSource = interactionSource,
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                        focusedBorderColor = SwastikPrimary,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                        focusedContainerColor = MaterialTheme.colorScheme.surface
                    ),
                    singleLine = true
                )

                // Suggestions / Results Dropdown
                if (isFocused || searchQuery.isNotEmpty()) {
                    val displayList = if (searchQuery.isEmpty()) suggestions else filteredSpecialities
                    
                    if (displayList.isNotEmpty()) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 4.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(4.dp)
                        ) {
                            Column {
                                displayList.forEach { item ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                searchQuery = item
                                                val (spec, search) = com.example.swastik.utils.SpecializationMapper.mapToSearchParams(item)
                                                onSpecialityClick(spec, search)
                                            }
                                            .padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            if (searchQuery.isEmpty()) Icons.Default.NorthEast else Icons.Outlined.Search,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Text(getTranslatedCategoryText(item), fontSize = 14.sp)
                                    }
                                    if (item != displayList.last()) {
                                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ── Most Searched Specialities ──
            SectionHeader(title = stringResource(R.string.most_searched_specialities))
            Spacer(modifier = Modifier.height(16.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Show only first 5 on screen
                items(mostSearchedSpecialities.take(5)) { item ->
                    SpecialityCard(
                        name = item.name,
                        icon = item.icon,
                        bgColor = item.bgColor,
                        iconTint = item.iconTint,
                        imageRes = getSpecialityImage(item.name),
                        onClick = {
                            val (spec, search) = com.example.swastik.utils.SpecializationMapper.mapToSearchParams(item.name)
                            onSpecialityClick(spec, search)
                        }
                    )
                }

                // Inline "View More" card after 5 items
                item {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .padding(start = 4.dp, end = 8.dp)
                            .clickable { onViewAllSpecialities() }
                    ) {
                        Box(
                            modifier = Modifier
                                .size(60.dp)
                                .clip(CircleShape)
                                .background(SwastikPrimary.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = "View More",
                                tint = SwastikPrimary,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "View\nMore",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = SwastikPrimary,
                            textAlign = TextAlign.Center,
                            lineHeight = 13.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // ── Conditions treated through surgeries ──
            SectionHeader(title = stringResource(R.string.surgery_conditions))
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                stringResource(R.string.find_top_surgeons_near_you),
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(surgeryConditions) { item ->
                    SpecialityCard(
                        name = item.name,
                        icon = item.icon,
                        bgColor = item.bgColor,
                        iconTint = SwastikPrimary,
                        imageRes = getSpecialityImage(item.name),
                        onClick = {
                            val (spec, search) = com.example.swastik.utils.SpecializationMapper.mapToSearchParams(item.name)
                            onSpecialityClick(spec, search)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // ── Most Common Symptoms ──
            SectionHeader(title = stringResource(R.string.common_symptoms))
            Spacer(modifier = Modifier.height(16.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(mostCommonSymptoms) { item ->
                    SpecialityCard(
                        name = item.name,
                        icon = item.icon,
                        bgColor = item.bgColor,
                        iconTint = SwastikPrimary,
                        imageRes = getSpecialityImage(item.name),
                        onClick = {
                            val (spec, search) = com.example.swastik.utils.SpecializationMapper.mapToSearchParams(item.name)
                            onSpecialityClick(spec, search)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // ── Categories (Large Cards) ──
            SectionHeader(title = "Categories")
            Spacer(modifier = Modifier.height(16.dp))
            
            val visibleCategories = categoryCards.take(8)

            CategoriesGrid(
                items = visibleCategories,
                onItemClick = { 
                    val (spec, search) = com.example.swastik.utils.SpecializationMapper.mapToSearchParams(it.title)
                    onSpecialityClick(spec, search) 
                }
            )

            if (categoryCards.size > 8) {
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedButton(
                    onClick = onViewAllCategories,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, SwastikPrimary)
                ) {
                    Text(
                        "View All ${categoryCards.size} Categories",
                        color = SwastikPrimary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp
                    )
                }
            }

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
        color = MaterialTheme.colorScheme.onSurface,
        modifier = Modifier.padding(horizontal = 16.dp)
    )
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
                                if (item.imageRes != null) {
                                    Image(
                                        painter = painterResource(id = item.imageRes),
                                        contentDescription = item.title,
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop
                                    )
                                } else {
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
                            }
                            // Text area
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp)
                            ) {
                                Text(
                                    text = getTranslatedCategoryText(item.title),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = getTranslatedCategoryText(item.description),
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
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
