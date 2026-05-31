package com.example.swastik.ui.screens.patient

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
                    IconButton(onClick = { /* Handle favorite */ }) {
                        Icon(Icons.Outlined.FavoriteBorder, contentDescription = "Favorite")
                    }
                    IconButton(onClick = { /* Handle share */ }) {
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
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                    modifier = Modifier.fillMaxWidth().height(80.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "₹${doctor.consultationFee ?: 500}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Consultation Fee",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Button(
                        onClick = { onBookClick(doctorId) },
                        colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1.5f).height(50.dp)
                    ) {
                        Icon(Icons.Outlined.CalendarMonth, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Book Appointment", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
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
                        .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(16.dp))
                        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
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
                label = "Rating"
            )
            StatCard(
                icon = Icons.Outlined.Payments,
                value = "₹${doctor.consultationFee ?: 0}",
                label = "Consultation\nFee"
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Queue Status Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(10.dp).background(SwastikPrimary, CircleShape))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Available Today", fontWeight = FontWeight.SemiBold, color = SwastikPrimary, fontSize = 14.sp)
                    }
                    val nextSlot = details.schedules.firstOrNull()?.startTime ?: "N/A"
                    Text("Next Slot: $nextSlot", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                Divider(modifier = Modifier.padding(vertical = 12.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.People, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("Queue Status", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            val aheadCount = queueStats?.currentQueue ?: details.queueCount ?: 0
                            val waitTime = queueStats?.estimatedWaitTime ?: (aheadCount * 15)
                            Text("$aheadCount patients ahead of you", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (aheadCount > 0) {
                                Text("~${waitTime} mins wait time", fontSize = 11.sp, color = SwastikPrimary)
                            }
                        }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { /* Handle View Queue */ }) {
                        Text("View Queue", color = SwastikPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = SwastikPrimary)
                    }
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
                                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))
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

        // Clinic Information
        details.clinics?.firstOrNull()?.let { clinic ->
            Text("Clinic Information", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(bottom = 12.dp))
            Row(verticalAlignment = Alignment.Top, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(clinic.name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    Text(clinic.address, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text("Get Directions", color = SwastikPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.clickable { })
            }
            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.Top) {
                Icon(Icons.Outlined.AccessTime, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("Consultation Hours", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text("Mon - Sat: 10:00 AM - 8:30 PM", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
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
        details.reviews?.take(2)?.forEach { review ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
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
                    Text(review.comment ?: "Good experience.", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
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
        modifier = Modifier.weight(1f).padding(horizontal = 4.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(vertical = 16.dp, horizontal = 4.dp).fillMaxWidth()
        ) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center, lineHeight = 14.sp)
        }
    }
}
