package com.example.swastik.ui.screens.patient

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.R
import com.example.swastik.data.model.DoctorDetails
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import com.example.swastik.ui.viewmodel.DoctorProfileViewModel
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DoctorProfileScreen(
    doctorId: String,
    onBackClick: () -> Unit,
    onBookClick: (String) -> Unit,
    viewModel: DoctorProfileViewModel = hiltViewModel()
) {
    LaunchedEffect(doctorId) {
        viewModel.fetchDoctorDetails(doctorId)
    }

    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var isFavorite by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Doctor Profile", fontWeight = FontWeight.SemiBold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { isFavorite = !isFavorite }) {
                        Icon(
                            if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, 
                            contentDescription = "Favorite",
                            tint = if (isFavorite) Color.Red else MaterialTheme.colorScheme.onSurface
                        )
                    }
                    IconButton(onClick = { 
                        if (uiState is DoctorProfileViewModel.UiState.Success) {
                            val doctor = (uiState as DoctorProfileViewModel.UiState.Success).details.doctor
                            val shareIntent = Intent().apply {
                                action = Intent.ACTION_SEND
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, "Check out Dr. ${doctor.name}, ${doctor.specialization} on Swastik! Book an appointment now.")
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share Doctor Profile"))
                        }
                    }) {
                        Icon(Icons.Outlined.Share, contentDescription = "Share")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            if (uiState is DoctorProfileViewModel.UiState.Success) {
                val doctor = (uiState as DoctorProfileViewModel.UiState.Success).details.doctor
                BottomAppBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    modifier = Modifier.fillMaxWidth().height(80.dp)
                ) {
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "₹${doctor.consultationFee ?: 500}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Consultation Fee",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { onBookClick(doctorId) },
                        colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1.5f).height(48.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Icon(Icons.Outlined.CalendarMonth, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = "Book Appointment", 
                            fontSize = 14.sp, 
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when (val state = uiState) {
                is DoctorProfileViewModel.UiState.Loading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = SwastikPrimary
                    )
                }
                is DoctorProfileViewModel.UiState.Error -> {
                    Text(
                        text = state.message,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                is DoctorProfileViewModel.UiState.Success -> {
                    DoctorProfileContent(state.details, state.queueStats)
                }
            }
        }
    }
}

@Composable
fun DoctorProfileContent(details: DoctorDetails, queueStats: com.example.swastik.data.remote.dto.DoctorQueueStatsDto?) {
    val scrollState = rememberScrollState()
    val doctor = details.doctor

    val qualificationText = doctor.qualification?.takeIf { it.isNotBlank() }
        ?: doctor.qualifications?.filter { it.isNotBlank() }?.joinToString(", ")?.takeIf { it.isNotBlank() }
        ?: "Qualification not listed"
        
    var isBioExpanded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(20.dp)
    ) {
        // Top Profile Section
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Rounded Image
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .background(SwastikPrimaryLight, RoundedCornerShape(24.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (!doctor.profileImageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = doctor.profileImageUrl,
                        contentDescription = "Doctor Profile",
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(24.dp)),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Text("Dr", fontSize = 40.sp, color = SwastikPrimary)
                }
                // Verified Badge
                Icon(
                    Icons.Filled.CheckCircle,
                    contentDescription = "Verified",
                    tint = SwastikPrimary,
                    modifier = Modifier
                        .size(24.dp)
                        .align(Alignment.TopEnd)
                        .offset(x = 6.dp, y = (-6).dp)
                        .background(MaterialTheme.colorScheme.surface, CircleShape)
                )
            }

            Spacer(modifier = Modifier.width(20.dp))

            Column {
                Text(
                    text = doctor.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 24.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = doctor.specialization,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    color = SwastikPrimary,
                    modifier = Modifier.padding(vertical = 4.dp)
                )
                Text(
                    text = qualificationText,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                val exp = doctor.experienceYears
                if (exp != null && exp > 0) {
                    Text(
                        text = "$exp+ Years Experience",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                // Small Rating Pill
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(16.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFB800), modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = doctor.averageRating?.let { String.format(Locale.US, "%.1f", it) } ?: "5.0",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = "(${doctor.totalReviews ?: 0} reviews)",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Stats Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            StatCard(
                icon = Icons.Outlined.Group,
                value = "${doctor.totalConsultations ?: 0}+",
                label = "Patients\nTreated"
            )
            StatCard(
                icon = Icons.Outlined.WorkOutline,
                value = "${doctor.experienceYears ?: 0}+",
                label = "Years\nExperience"
            )
            StatCard(
                icon = Icons.Filled.Star,
                iconTint = Color(0xFFFFB800),
                value = doctor.averageRating?.let { String.format(Locale.US, "%.1f", it) } ?: "5.0",
                label = "Rating\n"
            )
            StatCard(
                icon = Icons.Outlined.Payments,
                value = "₹${doctor.consultationFee ?: 0}",
                label = "Consult\nFee"
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Queue Status Card
        Card(
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp).fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.size(48.dp).background(MaterialTheme.colorScheme.surfaceVariant, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.People, contentDescription = null, tint = SwastikPrimary)
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        val rawSlot = details.schedules.firstOrNull()?.startTime
                        val formattedSlot = if (rawSlot != null) {
                            try {
                                val parts = rawSlot.split(":")
                                val h = parts[0].toInt()
                                val m = parts.getOrNull(1) ?: "00"
                                val ampm = if (h >= 12) "PM" else "AM"
                                val h12 = if (h % 12 == 0) 12 else h % 12
                                "$h12:$m $ampm"
                            } catch (e: Exception) { rawSlot }
                        } else "N/A"
                        
                        Text(
                            text = "Next Slot: $formattedSlot", 
                            fontSize = 15.sp, 
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(8.dp).background(Color(0xFF4CAF50), CircleShape))
                            Spacer(modifier = Modifier.width(6.dp))
                            val aheadCount = queueStats?.currentQueue ?: details.queueCount ?: (1..5).random()
                            val waitTime = queueStats?.estimatedWaitTime ?: (aheadCount * 15)
                            Text(
                                text = "Queue: $aheadCount ahead • ~$waitTime mins", 
                                fontSize = 13.sp, 
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                Spacer(modifier = Modifier.height(12.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { /* Handle View Queue */ },
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("View Full Queue Status", color = SwastikPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(Icons.Default.ArrowForward, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(16.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // About
        Text("About Doctor", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(bottom = 8.dp))
        val bioText = doctor.bio ?: "Profile summary has not been added yet."
        Text(
            text = bioText,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = if (isBioExpanded) Int.MAX_VALUE else 3,
            overflow = TextOverflow.Ellipsis
        )
        if (bioText.length > 100) {
            Text(
                text = if (isBioExpanded) "Read Less" else "Read More",
                color = SwastikPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                modifier = Modifier
                    .padding(top = 4.dp)
                    .clickable { isBioExpanded = !isBioExpanded }
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Specializations (Tags/Grid)
        Text("Specializations", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(bottom = 12.dp))
        val defaultSpecializations = listOf("Sinus Treatment", "Ear Infection", "Hearing Loss", "Tonsillitis", "Nasal Allergy", "Throat Infection")
        val specs = doctor.qualifications?.takeIf { it.isNotEmpty() } ?: defaultSpecializations
        
        // Custom Grid
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            specs.chunked(2).forEach { rowSpecs ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    rowSpecs.forEach { spec ->
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Outlined.MedicalServices, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(spec, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                    if (rowSpecs.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Education
        Text("Education & Qualifications", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(bottom = 12.dp))
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val eduList = doctor.qualifications ?: listOf("MBBS", "MD")
            eduList.forEach { edu ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.School, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(12.dp))
                    Text(edu, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Clinic & Hospital Affiliations
        val allAffiliations = mutableListOf<@Composable () -> Unit>()
        
        details.clinics?.forEach { clinic ->
            allAffiliations.add {
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { /* Navigate to Clinic Details */ },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.LocalHospital, contentDescription = null, tint = SwastikPrimary)
                            Spacer(Modifier.width(8.dp))
                            Text(clinic.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.Top) {
                            Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(clinic.address, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = { /* Navigate to Clinic Details */ },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("View Clinic Details")
                        }
                    }
                }
            }
        }
        
        details.hospitals?.forEach { hospital ->
            allAffiliations.add {
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { /* Navigate to Hospital Details */ },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.LocalHospital, contentDescription = null, tint = SwastikPrimary)
                            Spacer(Modifier.width(8.dp))
                            Text(hospital.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.Top) {
                            Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(hospital.address, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = { /* Navigate to Hospital Details */ },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("View Hospital Details")
                        }
                    }
                }
            }
        }

        if (allAffiliations.isNotEmpty()) {
            Text("Affiliated Clinics & Hospitals", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(bottom = 12.dp))
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                allAffiliations.forEach { it() }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }

        // Reviews Section
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
            Text("Patient Reviews", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("View All", color = SwastikPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.clickable { })
        }

        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(0.3f)) {
                Text(
                    text = doctor.averageRating?.let { String.format(Locale.US, "%.1f", it) } ?: "5.0",
                    fontWeight = FontWeight.Bold,
                    fontSize = 40.sp
                )
                Row {
                    repeat(5) {
                        Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFB800), modifier = Modifier.size(16.dp))
                    }
                }
                Text(
                    text = "(${doctor.totalReviews ?: 0} reviews)",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(24.dp))

            // Progress Bars
            Column(modifier = Modifier.weight(0.7f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                val dist = details.reviewDistribution ?: emptyMap()
                val total = doctor.totalReviews ?: 1
                listOf(5, 4, 3, 2, 1).forEach { stars ->
                    val count = dist[stars.toString()] ?: 0
                    val progress = if (total > 0) count.toFloat() / total else 0f
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("$stars", fontSize = 12.sp, modifier = Modifier.width(12.dp))
                        Icon(Icons.Filled.Star, contentDescription = null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.width(8.dp))
                        LinearProgressIndicator(
                            progress = progress,
                            modifier = Modifier.weight(1f).height(6.dp).clip(RoundedCornerShape(3.dp)),
                            color = SwastikPrimary,
                            trackColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("$count", fontSize = 12.sp, modifier = Modifier.width(24.dp))
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Individual Review Cards
        if (!details.reviews.isNullOrEmpty()) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(horizontal = 16.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
            ) {
                items(details.reviews) { review ->
                    Card(
                        modifier = Modifier.width(320.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                        shape = RoundedCornerShape(12.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(modifier = Modifier.size(40.dp).background(SwastikPrimaryLight, CircleShape), contentAlignment = Alignment.Center) {
                                    Text(text = (review.patient?.name ?: "Anonymous").firstOrNull()?.toString() ?: "A", color = SwastikPrimary, fontWeight = FontWeight.Bold)
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(text = review.patient?.name ?: "Anonymous", style = MaterialTheme.typography.titleMedium)
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        repeat(5) { i ->
                                            Icon(
                                                Icons.Filled.Star, 
                                                contentDescription = null, 
                                                tint = if (i < review.rating) Color(0xFFFFB800) else MaterialTheme.colorScheme.surfaceVariant, 
                                                modifier = Modifier.size(14.dp)
                                            )
                                        }
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(review.comment ?: "Good experience.", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 4, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(100.dp)) // padding for bottom bar
    }
}

@Composable
fun RowScope.StatCard(
    icon: ImageVector,
    iconTint: Color = SwastikPrimary,
    value: String,
    label: String
) {
    Card(
        modifier = Modifier
            .weight(1f)
            .padding(horizontal = 4.dp)
            .height(96.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.fillMaxSize().padding(horizontal = 2.dp)
        ) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(22.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = SwastikPrimary)
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = label, 
                fontSize = 10.sp, 
                color = MaterialTheme.colorScheme.onSurfaceVariant, 
                textAlign = androidx.compose.ui.text.style.TextAlign.Center, 
                lineHeight = 12.sp,
                maxLines = 2
            )
        }
    }
}
