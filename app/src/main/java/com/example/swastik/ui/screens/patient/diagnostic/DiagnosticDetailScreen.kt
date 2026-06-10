package com.example.swastik.ui.screens.patient.diagnostic

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.ui.theme.SwastikPrimary

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun DiagnosticDetailScreen(
    centerId: String,
    onBackClick: () -> Unit,
    onBookTestsClick: (MedicalFacility) -> Unit,
    onNavigateToHospital: (String) -> Unit,
    onNavigateToClinic: (String) -> Unit,
    viewModel: DiagnosticDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val colorScheme = MaterialTheme.colorScheme
    val isDarkSurface = colorScheme.surface.luminance() < 0.5f
    val bgColor = if (isDarkSurface) colorScheme.background else Color(0xFFF8FAFC)

    LaunchedEffect(centerId) {
        viewModel.loadDiagnosticDetails(centerId)
    }

    Scaffold(
        containerColor = bgColor,
        topBar = {
            TopAppBar(
                title = { Text("Diagnostic Center", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colorScheme.surface,
                    titleContentColor = colorScheme.onSurface
                )
            )
        },
        bottomBar = {
            if (uiState is DiagnosticDetailUiState.Success) {
                val facility = (uiState as DiagnosticDetailUiState.Success).facility
                Surface(
                    color = colorScheme.surface,
                    tonalElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(modifier = Modifier.padding(16.dp)) {
                        Button(
                            onClick = { onBookTestsClick(facility) },
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                        ) {
                            Icon(Icons.Default.Science, contentDescription = null, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Book Tests", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val state = uiState) {
                is DiagnosticDetailUiState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                is DiagnosticDetailUiState.Error -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center).padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.ErrorOutline, null, modifier = Modifier.size(64.dp), tint = colorScheme.error)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(state.message, color = colorScheme.error, textAlign = TextAlign.Center)
                        Spacer(modifier = Modifier.height(24.dp))
                        Button(onClick = { viewModel.loadDiagnosticDetails(centerId) }) {
                            Text("Retry")
                        }
                    }
                }
                is DiagnosticDetailUiState.Success -> {
                    val facility = state.facility
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 80.dp) // space for bottom bar
                    ) {
                        item {
                            DiagnosticHeaderSection(facility = facility, colorScheme = colorScheme)
                        }
                        
                        // Affiliated Hospital / Clinic Banner
                        if (facility.hospitalId != null || facility.clinicId != null) {
                            item {
                                AffiliatedBanner(
                                    facility = facility,
                                    onNavigateToHospital = onNavigateToHospital,
                                    onNavigateToClinic = onNavigateToClinic,
                                    colorScheme = colorScheme
                                )
                            }
                        }

                        item {
                            DiagnosticInfoSection(facility = facility, colorScheme = colorScheme)
                        }
                        
                        item {
                            Spacer(modifier = Modifier.height(32.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DiagnosticHeaderSection(facility: MedicalFacility, colorScheme: ColorScheme) {
    Surface(
        color = colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = 2.dp
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.Top, modifier = Modifier.fillMaxWidth()) {
                Box(
                    modifier = Modifier.size(64.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFFE8EAF6)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Science, contentDescription = null, tint = Color(0xFF3F51B5), modifier = Modifier.size(32.dp))
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = facility.name,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = colorScheme.onSurface,
                        lineHeight = 30.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFB300), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${facility.rating} (${facility.reviewCount} Reviews)",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AffiliatedBanner(
    facility: MedicalFacility,
    onNavigateToHospital: (String) -> Unit,
    onNavigateToClinic: (String) -> Unit,
    colorScheme: ColorScheme
) {
    val isHospital = facility.hospitalId != null
    val targetId = facility.hospitalId ?: facility.clinicId ?: return
    val label = if (isHospital) "Affiliated Hospital" else "Affiliated Clinic"
    
    Card(
        modifier = Modifier.fillMaxWidth().padding(16.dp).clickable {
            if (isHospital) onNavigateToHospital(targetId) else onNavigateToClinic(targetId)
        },
        colors = CardDefaults.cardColors(containerColor = colorScheme.primaryContainer),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(40.dp).background(colorScheme.primary.copy(alpha=0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Business, contentDescription = null, tint = colorScheme.primary)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("View Details", fontWeight = FontWeight.Bold, color = colorScheme.onPrimaryContainer, fontSize = 16.sp)
                Text(label, color = colorScheme.onPrimaryContainer.copy(alpha=0.8f), fontSize = 14.sp)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = colorScheme.primary)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DiagnosticInfoSection(facility: MedicalFacility, colorScheme: ColorScheme) {
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text("Contact & Info", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = colorScheme.onSurface)
        Spacer(modifier = Modifier.height(12.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                // Location
                Row(verticalAlignment = Alignment.Top, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                    Icon(Icons.Default.LocationOn, contentDescription = "Location", tint = colorScheme.primary, modifier = Modifier.padding(top = 2.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text("Address", fontSize = 14.sp, color = colorScheme.onSurfaceVariant)
                        Text(facility.address, fontSize = 15.sp, color = colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
                        Text(facility.distance, fontSize = 13.sp, color = colorScheme.primary, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 4.dp))
                    }
                }
                Divider(color = colorScheme.outlineVariant.copy(alpha=0.5f))
                // Time
                Row(verticalAlignment = Alignment.Top, modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp)) {
                    Icon(Icons.Default.AccessTime, contentDescription = "Time", tint = colorScheme.primary, modifier = Modifier.padding(top = 2.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text("Timings", fontSize = 14.sp, color = colorScheme.onSurfaceVariant)
                        val timeStr = if (facility.is24Hours) "Open 24 Hours"
                        else if (facility.openTime != null && facility.closeTime != null) "${facility.openTime} - ${facility.closeTime}"
                        else "Hours vary"
                        Text(timeStr, fontSize = 15.sp, color = colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
                    }
                }
                Divider(color = colorScheme.outlineVariant.copy(alpha=0.5f))
                // Features
                Row(verticalAlignment = Alignment.Top, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                    Icon(Icons.Default.Info, contentDescription = "Features", tint = colorScheme.primary, modifier = Modifier.padding(top = 2.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text("Features", fontSize = 14.sp, color = colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(8.dp))
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (facility.homeCollectionAvailable) {
                                FeatureChip(text = "Home Collection", colorScheme = colorScheme)
                            }
                            if (facility.isOpen) {
                                FeatureChip(text = "Currently Open", colorScheme = colorScheme)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FeatureChip(text: String, colorScheme: ColorScheme) {
    Surface(
        color = colorScheme.primaryContainer.copy(alpha = 0.5f),
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            color = colorScheme.onPrimaryContainer
        )
    }
}
