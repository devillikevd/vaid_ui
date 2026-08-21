package com.example.swastik.ui.screens.patient.booking

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.specialities.SpecialityConditionCategory
import com.example.swastik.data.specialities.SpecialityConsultationStep
import com.example.swastik.data.specialities.SpecialityDetailData
import com.example.swastik.data.specialities.SpecialityFaqItem
import com.example.swastik.data.specialities.SpecialityRegistry
import com.example.swastik.data.specialities.SpecialitySymptom
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpecialityDetailScreen(
    specialization: String,
    search: String? = null,
    mode: String = "in_person",
    onBackClick: () -> Unit,
    onConsultClick: (String, String?, String) -> Unit
) {
    val specialityData = remember(specialization, search) {
        SpecialityRegistry.getSpecialityData(specialization, search)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = specialityData.title,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 17.sp,
                            color = WellnessTheme.TealDeep,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = if (mode == "video") "Video Consultation Overview" else "Clinic Consultation Overview",
                            fontSize = 11.5.sp,
                            color = Color(0xFF64748B),
                            fontWeight = FontWeight.Medium
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = WellnessTheme.TealDeep
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        bottomBar = {
            SpecialityBottomActionBar(
                specialityTitle = specialityData.title,
                onConsultClick = { onConsultClick(specialization, search, mode) }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1️⃣ Flagship Hero Banner (Compact & Sleek)
            item {
                SpecialityHeroBanner(data = specialityData)
            }

            // 2️⃣ "About / Who is" Section
            item {
                SpecialityAboutCard(data = specialityData)
            }

            // 3️⃣ Common Symptoms & When to Consult
            item {
                SpecialitySymptomsSection(symptoms = specialityData.symptoms)
            }

            // 4️⃣ Key Conditions Treated
            item {
                SpecialityConditionsSection(categories = specialityData.conditionCategories)
            }

            // 5️⃣ What to Expect in a Consultation
            item {
                SpecialityConsultationStepsSection(steps = specialityData.consultationSteps)
            }

            // 6️⃣ FAQs Accordion
            item {
                SpecialityFaqSection(faqs = specialityData.faqs)
            }

            // 7️⃣ Trust & Security Badge Banner
            item {
                SpecialityTrustStrip()
            }

            // Bottom Spacing for Fixed Button
            item {
                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }
}

// ==================== 1️⃣ FLAGSHIP HERO BANNER ====================

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SpecialityHeroBanner(data: SpecialityDetailData) {
    val imageRes = remember(data.title) { getSpecialityImage(data.title) }

    val heroIcon = when {
        data.id.contains("vet") || data.id.contains("pet") || data.id.contains("animal") -> Icons.Outlined.Pets
        data.id.contains("derma") || data.id.contains("skin") || data.id.contains("hair") || data.id.contains("plastic") -> Icons.Outlined.Face
        data.id.contains("gynec") || data.id.contains("women") || data.id.contains("fertility") || data.id.contains("ivf") -> Icons.Outlined.PregnantWoman
        data.id.contains("dent") -> Icons.Outlined.Mood
        data.id.contains("child") || data.id.contains("pediat") -> Icons.Outlined.ChildCare
        data.id.contains("ear") || data.id.contains("ent") -> Icons.Outlined.Hearing
        data.id.contains("heart") || data.id.contains("cardio") -> Icons.Outlined.Favorite
        data.id.contains("mind") || data.id.contains("mental") || data.id.contains("psych") -> Icons.Outlined.Psychology
        data.id.contains("bone") || data.id.contains("ortho") || data.id.contains("spine") || data.id.contains("physio") || data.id.contains("sports") -> Icons.Outlined.Accessibility
        data.id.contains("eye") || data.id.contains("opht") -> Icons.Outlined.Visibility
        data.id.contains("lung") || data.id.contains("pulmo") || data.id.contains("allerg") -> Icons.Outlined.Air
        data.id.contains("diet") || data.id.contains("nutrit") -> Icons.Outlined.Restaurant
        data.id.contains("ayurved") || data.id.contains("homeopath") -> Icons.Outlined.Spa
        data.id.contains("kidney") || data.id.contains("nephro") || data.id.contains("uro") -> Icons.Outlined.WaterDrop
        data.id.contains("surg") || data.id.contains("laparo") || data.id.contains("procto") || data.id.contains("vascul") -> Icons.Outlined.Healing
        data.id.contains("cancer") || data.id.contains("oncol") -> Icons.Outlined.Shield
        data.id.contains("diabet") || data.id.contains("endocrin") -> Icons.Outlined.Bloodtype
        else -> Icons.Default.MedicalServices
    }

    Surface(
        shape = RoundedCornerShape(18.dp),
        shadowElevation = 3.dp,
        border = BorderStroke(1.dp, Color(0xFF14B8A6).copy(alpha = 0.25f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .background(
                    Brush.linearGradient(
                        listOf(
                            WellnessTheme.TealDeep,
                            Color(0xFF0F766E),
                            Color(0xFF115E59)
                        )
                    )
                )
                .padding(14.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // Top Row: Avatar + Title & Subtitle
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Avatar Thumbnail
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color.White.copy(alpha = 0.18f),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
                        modifier = Modifier.size(52.dp),
                        shadowElevation = 1.dp
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            if (imageRes != null) {
                                Image(
                                    painter = painterResource(id = imageRes),
                                    contentDescription = data.title,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(3.dp)
                                        .clip(RoundedCornerShape(11.dp)),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Icon(
                                    imageVector = heroIcon,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                        }
                    }

                    Column(
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(5.dp)
                        ) {
                            Text(
                                text = data.title,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Icon(
                                imageVector = Icons.Default.Verified,
                                contentDescription = "Verified Speciality",
                                tint = Color(0xFF5EEAD4),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Text(
                            text = data.subtitle,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFFCCFBF1),
                            lineHeight = 15.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Crisp Hero Description
                Text(
                    text = data.heroDescription,
                    fontSize = 12.5.sp,
                    color = Color.White.copy(alpha = 0.92f),
                    lineHeight = 17.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )

                // Trust Badges FlowRow (wraps gracefully without stretching)
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    data.trustBadges.forEach { badge ->
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color.White.copy(alpha = 0.15f),
                            border = BorderStroke(0.8.dp, Color.White.copy(alpha = 0.25f))
                        ) {
                            Text(
                                text = badge,
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

// ==================== 2️⃣ ABOUT SPECIALITY CARD ====================

@Composable
private fun SpecialityAboutCard(data: SpecialityDetailData) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2F3F0)),
        shadowElevation = 1.5.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFFF8FDFD), Color.White)
                    )
                )
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = WellnessTheme.TealPrimary.copy(alpha = 0.12f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = WellnessTheme.TealPrimary,
                        modifier = Modifier
                            .padding(5.dp)
                            .size(16.dp)
                    )
                }
                Text(
                    text = "Who is a ${data.title}?",
                    fontSize = 14.5.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = WellnessTheme.TealDeep
                )
            }

            Text(
                text = data.aboutDescription,
                fontSize = 12.5.sp,
                color = Color(0xFF475569),
                lineHeight = 18.sp
            )
        }
    }
}

// ==================== 3️⃣ COMMON SYMPTOMS & WHEN TO CONSULT ====================

@Composable
private fun SpecialitySymptomsSection(symptoms: List<SpecialitySymptom>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "🚨",
                fontSize = 15.sp
            )
            Text(
                text = "When Should You Consult?",
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = WellnessTheme.TealDeep
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            val chunked = symptoms.chunked(2)
            chunked.forEach { rowSymptoms ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    rowSymptoms.forEach { symptom ->
                        SymptomCard(
                            symptom = symptom,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    if (rowSymptoms.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun SymptomCard(symptom: SpecialitySymptom, modifier: Modifier = Modifier) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2F3F0)),
        shadowElevation = 1.dp,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .background(Brush.verticalGradient(listOf(Color(0xFFF8FDFD), Color.White)))
                .padding(11.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = WellnessTheme.TealPrimary.copy(alpha = 0.08f),
                modifier = Modifier.size(34.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = symptom.emoji,
                        fontSize = 17.sp
                    )
                }
            }

            Text(
                text = symptom.title,
                fontSize = 12.5.sp,
                fontWeight = FontWeight.Bold,
                color = WellnessTheme.TealDeep,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = symptom.subtitle,
                fontSize = 11.sp,
                color = Color(0xFF64748B),
                lineHeight = 14.5.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

// ==================== 4️⃣ KEY CONDITIONS TREATED ====================

@Composable
private fun SpecialityConditionsSection(categories: List<SpecialityConditionCategory>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "🔬",
                fontSize = 15.sp
            )
            Text(
                text = "Key Conditions & Diseases Treated",
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = WellnessTheme.TealDeep
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            categories.forEach { category ->
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, Color(0xFFE2F3F0)),
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(13.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = category.categoryName,
                            fontSize = 13.5.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = WellnessTheme.TealDark
                        )
                        category.items.forEach { item ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Surface(
                                    shape = CircleShape,
                                    color = WellnessTheme.TealPrimary.copy(alpha = 0.12f),
                                    modifier = Modifier.size(16.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = null,
                                            tint = WellnessTheme.TealPrimary,
                                            modifier = Modifier.size(10.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = item,
                                    fontSize = 12.sp,
                                    color = Color(0xFF334155),
                                    fontWeight = FontWeight.Medium,
                                    lineHeight = 15.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==================== 5️⃣ WHAT TO EXPECT IN CONSULTATION (CLINICAL STEPPER) ====================

@Composable
private fun SpecialityConsultationStepsSection(steps: List<SpecialityConsultationStep>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "🩺",
                fontSize = 15.sp
            )
            Text(
                text = "What to Expect in a Consultation",
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = WellnessTheme.TealDeep
            )
        }

        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            border = BorderStroke(1.dp, Color(0xFFE2F3F0)),
            shadowElevation = 1.5.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(0.dp)
            ) {
                steps.forEachIndexed { index, step ->
                    val isLast = index == steps.size - 1
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        // Stepper Node with Connecting Line
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.width(26.dp)
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = WellnessTheme.TealPrimary,
                                shadowElevation = 1.5.dp,
                                modifier = Modifier.size(26.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = step.stepNumber,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.White
                                    )
                                }
                            }

                            if (!isLast) {
                                Box(
                                    modifier = Modifier
                                        .width(2.dp)
                                        .height(36.dp)
                                        .background(WellnessTheme.TealPrimary.copy(alpha = 0.25f))
                                )
                            }
                        }

                        // Step Text
                        Column(
                            verticalArrangement = Arrangement.spacedBy(2.dp),
                            modifier = Modifier
                                .weight(1f)
                                .padding(bottom = if (isLast) 0.dp else 12.dp)
                        ) {
                            Text(
                                text = step.title,
                                fontSize = 13.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = WellnessTheme.TealDeep
                            )
                            Text(
                                text = step.description,
                                fontSize = 12.sp,
                                color = Color(0xFF64748B),
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

// ==================== 6️⃣ FAQ SECTION ====================

@Composable
private fun SpecialityFaqSection(faqs: List<SpecialityFaqItem>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "💡",
                fontSize = 15.sp
            )
            Text(
                text = "Frequently Asked Questions",
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = WellnessTheme.TealDeep
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            faqs.forEach { faq ->
                FaqAccordionItem(faq = faq)
            }
        }
    }
}

@Composable
private fun FaqAccordionItem(faq: SpecialityFaqItem) {
    var isExpanded by rememberSaveable { mutableStateOf(false) }
    val rotationAngle by animateFloatAsState(targetValue = if (isExpanded) 180f else 0f, label = "faqChevron")

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        border = BorderStroke(1.dp, if (isExpanded) WellnessTheme.TealPrimary.copy(alpha = 0.4f) else Color(0xFFE2F3F0)),
        shadowElevation = 1.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { isExpanded = !isExpanded }
    ) {
        Column(
            modifier = Modifier
                .animateContentSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = faq.question,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isExpanded) WellnessTheme.TealPrimary else WellnessTheme.TealDeep,
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    imageVector = Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = if (isExpanded) WellnessTheme.TealPrimary else Color(0xFF94A3B8),
                    modifier = Modifier
                        .size(18.dp)
                        .rotate(rotationAngle)
                )
            }

            if (isExpanded) {
                Text(
                    text = faq.answer,
                    fontSize = 12.sp,
                    color = Color(0xFF475569),
                    lineHeight = 17.sp
                )
            }
        }
    }
}

// ==================== 7️⃣ TRUST & SECURITY STRIP ====================

@Composable
private fun SpecialityTrustStrip() {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color(0xFFF0FDF4),
        border = BorderStroke(1.dp, Color(0xFFBBF7D0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = Color(0xFF16A34A).copy(alpha = 0.15f),
                modifier = Modifier.size(28.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = null,
                        tint = Color(0xFF16A34A),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "100% Confidential & Certified Care",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF15803D)
                )
                Text(
                    text = "Encrypted consultations with verified specialists and instant digital prescriptions.",
                    fontSize = 10.5.sp,
                    color = Color(0xFF166534),
                    lineHeight = 13.5.sp
                )
            }
        }
    }
}

// ==================== 8️⃣ FIXED BOTTOM ACTION BAR ====================

@Composable
private fun SpecialityBottomActionBar(
    specialityTitle: String,
    onConsultClick: () -> Unit
) {
    Surface(
        color = Color.White,
        shadowElevation = 12.dp,
        border = BorderStroke(1.dp, Color(0xFFE2F3F0)),
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Button(
                onClick = onConsultClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = WellnessTheme.TealPrimary
                ),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Consult $specialityTitle Doctors",
                        fontSize = 14.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}
