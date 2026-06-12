package com.example.swastik.ui.screens.patient.diagnostic

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.outlined.MedicalServices
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.Timeline
import androidx.compose.material.icons.outlined.HealthAndSafety
import androidx.compose.material.icons.outlined.Memory
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.ShowChart
import androidx.compose.material.icons.outlined.CloudDownload
import androidx.compose.material.icons.outlined.Biotech
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.Camera

import androidx.compose.runtime.collectAsState
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIDiagnosticsDashboardScreen(
    onBackClick: () -> Unit,
    onNavigateToScan: (String) -> Unit,
    viewModel: AIDiagnosticsViewModel = hiltViewModel()
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val storageManager = remember { com.example.swastik.utils.ml.AIModelStorageManager(context) }
    
    val downloadProgress by viewModel.downloadProgress.collectAsState()
    
    // Refresh the downloaded models list whenever downloadProgress map changes
    val downloadedModels = remember(downloadProgress) { 
        storageManager.getDownloadedModels().map { it.modelId } 
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI Health Diagnostics", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF8F9FA))
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                DisclaimerCard()
            }

            
            val models = listOf(
                Triple("skin", "Skin Disease Detection", "Detect skin diseases (Melanoma, Eczema, etc.)"),
                Triple("brain", "Brain Tumor MRI Analysis", "Detect tumors in brain MRI"),
                Triple("pneumonia", "Pneumonia X-Ray Classifier", "Analyze chest X-Rays for pneumonia"),
                Triple("diabetic_retinopathy", "Diabetic Retinopathy", "Detect diabetic retinopathy from retinal scans"),
                Triple("malaria", "Malaria Cell Classification", "Analyze blood smears for malaria"),
                Triple("breast_cancer", "Breast Cancer Ultrasound", "Detect abnormalities in breast ultrasound")
            )
            
            val downloadedList = models.filter { it.first in downloadedModels }
            
            if (downloadedList.isEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(32.dp))
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Outlined.CloudDownload,
                            contentDescription = "No models",
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.outlineVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No AI Models Downloaded",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Go to your Profile -> Settings to download AI models for offline, instant analysis.",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 24.dp)
                        )
                    }
                }
            } else {
                item {
                    Text(
                        text = "Available Models",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                items(downloadedList.size) { index ->
                    val model = downloadedList[index]
                    val icon = when(model.first) {
                        "skin" -> Icons.Outlined.Biotech
                        "brain" -> Icons.Outlined.MonitorHeart
                        "pneumonia" -> Icons.Outlined.Camera
                        "diabetic_retinopathy" -> Icons.Outlined.Visibility
                        "malaria" -> Icons.Outlined.MedicalServices
                        "breast_cancer" -> Icons.Outlined.HealthAndSafety
                        else -> Icons.Outlined.MedicalServices
                    }
                    val color = when(model.first) {
                        "skin" -> Color(0xFFFFF3E0)
                        "brain" -> Color(0xFFE3F2FD)
                        "pneumonia" -> Color(0xFFE8F5E9)
                        "diabetic_retinopathy" -> Color(0xFFF3E5F5)
                        "malaria" -> Color(0xFFFFEBEE)
                        "breast_cancer" -> Color(0xFFE0F7FA)
                        else -> Color.LightGray
                    }
                    val iconTint = when(model.first) {
                        "skin" -> Color(0xFFF57C00)
                        "brain" -> Color(0xFF1976D2)
                        "pneumonia" -> Color(0xFF388E3C)
                        "diabetic_retinopathy" -> Color(0xFF7B1FA2)
                        "malaria" -> Color(0xFFD32F2F)
                        "breast_cancer" -> Color(0xFF0097A7)
                        else -> Color.DarkGray
                    }

                    ModelSelectionCard(
                        title = model.second,
                        description = model.third,
                        icon = icon,
                        color = color,
                        iconTint = iconTint,
                        isDownloaded = true,
                        progress = null,
                        onDownloadClick = {},
                        onClick = { onNavigateToScan(model.first) }
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Scan History",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            item {
                // Placeholder for scan history list (Will be implemented with Room DB)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No previous scans found.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
fun DisclaimerCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = "Warning",
                tint = Color(0xFFF57C00),
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "Medical Disclaimer",
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFE65100),
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "This AI tool provides preliminary insights and is not a substitute for professional medical advice. Always consult a specialized doctor for an accurate diagnosis before taking any medical action.",
                    fontSize = 12.sp,
                    color = Color(0xFFE65100),
                    lineHeight = 16.sp
                )
            }
        }
    }
}

@Composable
fun ModelSelectionCard(
    title: String,
    description: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    iconTint: Color,
    isDownloaded: Boolean,
    progress: Float?,
    onDownloadClick: () -> Unit,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { 
                if (isDownloaded) onClick() 
                else if (progress == null) onDownloadClick()
            },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(color),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = iconTint,
                    modifier = Modifier.size(28.dp)
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = description,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 16.sp
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            if (isDownloaded) {
                Box(
                    modifier = Modifier
                        .background(Color(0xFFE8F5E9), RoundedCornerShape(4.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("Ready", color = Color(0xFF2E7D32), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            } else if (progress != null) {
                androidx.compose.material3.CircularProgressIndicator(
                    progress = progress,
                    modifier = Modifier.size(24.dp),
                    color = Color(0xFFF57C00),
                    strokeWidth = 2.dp
                )
            } else {
                Box(
                    modifier = Modifier
                        .background(Color(0xFFFFF3E0), RoundedCornerShape(4.dp))
                        .clickable { onDownloadClick() }
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("Download", color = Color(0xFFF57C00), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
